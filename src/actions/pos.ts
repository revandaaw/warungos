"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext, requireRole } from "@/lib/tenant";
import { generateReceiptNo } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface CheckoutItemInput {
  productId: string;
  qty: number;
}

export interface CheckoutPayload {
  items: CheckoutItemInput[];
  cashReceived: number;
  idempotencyKey?: string;
}

export interface ReceiptData {
  receiptNo: string;
  createdAt: string;
  tenantName: string;
  cashierName: string;
  items: {
    name: string;
    qty: number;
    sellPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  grandTotal: number;
  cashReceived: number;
  change: number;
}

/**
 * POS-01 s/d POS-05, INV-03, BR-04, BR-05, BR-07, BR-09:
 * Transaksi Checkout Kasir (Atomik)
 */
export async function checkoutAction(payload: CheckoutPayload): Promise<{
  success: boolean;
  message: string;
  receipt?: ReceiptData;
}> {
  const { tenantId, userId, tenantName } = await requireTenantContext();

  if (!payload.items || payload.items.length === 0) {
    throw new Error("Keranjang belanja kosong.");
  }

  // Sanitasi kuantitas
  for (const it of payload.items) {
    if (it.qty <= 0) {
      throw new Error("Jumlah kuantitas barang harus lebih dari 0.");
    }
  }

  // Eksekusi atomik dalam Prisma Database Transaction
  const receipt = await prisma.$transaction(async (tx) => {
    // 1. Ambil data produk terbaru dari database (tidak percaya data client!)
    const productIds = payload.items.map((i) => i.productId);
    const dbProducts = await tx.product.findMany({
      where: {
        id: { in: productIds },
        tenantId, // Pastikan milik tenant aktif
        isActive: true,
      },
    });

    if (dbProducts.length !== payload.items.length) {
      throw new Error("Sebagian produk dalam keranjang tidak ditemukan atau sudah dinonaktifkan.");
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 2. Validasi stok cukup untuk setiap item (INV-03, BR-07: Tolak penjualan yang membuat stok negatif)
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const itemInput of payload.items) {
      const prod = productMap.get(itemInput.productId)!;

      if (prod.stockBalance < itemInput.qty) {
        throw new Error(
          `Stok tidak mencukupi untuk "${prod.name}". Sisa stok fisik: ${prod.stockBalance} ${prod.unit}, diminta: ${itemInput.qty} ${prod.unit}.`
        );
      }

      const lineTotal = prod.sellPrice * itemInput.qty;
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        product: prod,
        qty: itemInput.qty,
        lineTotal,
      });
    }

    const grandTotal = calculatedSubtotal; // Pada MVP belum ada pajak/diskon global kompleks

    // 3. Validasi Uang Tunai Diterima (POS-03)
    if (payload.cashReceived < grandTotal) {
      throw new Error(
        `Uang diterima (Rp ${payload.cashReceived.toLocaleString("id-ID")}) kurang dari total belanja (Rp ${grandTotal.toLocaleString("id-ID")}).`
      );
    }

    const changeTotal = payload.cashReceived - grandTotal;
    const receiptNo = generateReceiptNo();

    // 4. Buat Header Transaksi (Sales)
    const sale = await tx.sale.create({
      data: {
        tenantId,
        receiptNo,
        cashierId: userId,
        status: "COMPLETED",
        subtotal: calculatedSubtotal,
        discountTotal: 0,
        grandTotal,
        paidTotal: payload.cashReceived,
        changeTotal,
      },
    });

    // 5. Catat Pembayaran Tunai (Payment)
    await tx.payment.create({
      data: {
        tenantId,
        saleId: sale.id,
        method: "CASH",
        amount: payload.cashReceived,
      },
    });

    // 6. Buat Sale Items (Snapshot Harga) & Kurangi Stok & Catat Mutasi Stok
    const receiptItemList = [];

    for (const item of validatedItems) {
      // Simpan item transaksi dengan snapshot modal & jual saat ini (BR-05)
      await tx.saleItem.create({
        data: {
          tenantId,
          saleId: sale.id,
          productId: item.product.id,
          productNameSnapshot: item.product.name,
          qty: item.qty,
          costPriceSnapshot: item.product.costPrice,
          sellPriceSnapshot: item.product.sellPrice,
          discountAmount: 0,
          lineTotal: item.lineTotal,
        },
      });

      // Kurangi saldo stok produk
      await tx.product.update({
        where: { id: item.product.id },
        data: {
          stockBalance: { decrement: item.qty },
        },
      });

      // Catat pergerakan stok penjualan di ledger (INV-02: kuantitas negatif untuk penjualan)
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: item.product.id,
          movementType: "SALE",
          quantity: -item.qty,
          referenceType: "SALE",
          referenceId: sale.id,
          reason: `Penjualan kasir No. Nota ${receiptNo}`,
          createdBy: userId,
        },
      });

      receiptItemList.push({
        name: item.product.name,
        qty: item.qty,
        sellPrice: item.product.sellPrice,
        lineTotal: item.lineTotal,
      });
    }

    // 7. Ambil nama kasir
    const cashier = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return {
      receiptNo,
      createdAt: new Date().toISOString(),
      tenantName,
      cashierName: cashier?.name || "Kasir",
      items: receiptItemList,
      subtotal: calculatedSubtotal,
      grandTotal,
      cashReceived: payload.cashReceived,
      change: changeTotal,
    };
  });

  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/reports");

  return {
    success: true,
    message: "Transaksi berhasil diselesaikan.",
    receipt,
  };
}

/**
 * TXN-02 & BR-08: Pembatalan Transaksi Kasir (Void / Reversal)
 * Tidak menghapus secara fisik, mengubah status menjadi VOID dan mengembalikan stok lewat mutasi baru.
 */
export async function voidSaleAction(params: {
  saleId: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  // Hanya role OWNER yang berwenang membatalkan nota
  const { tenantId, userId } = await requireRole(["OWNER"]);

  if (!params.reason?.trim()) {
    throw new Error("Alasan pembatalan transaksi wajib dicatat untuk audit log.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Ambil transaksi yang bersangkutan
    const sale = await tx.sale.findFirst({
      where: { id: params.saleId, tenantId },
      include: { items: true },
    });

    if (!sale) {
      throw new Error("Data transaksi tidak ditemukan.");
    }

    if (sale.status === "VOID") {
      throw new Error("Transaksi ini sudah pernah dibatalkan sebelumnya.");
    }

    // 2. Ubah status transaksi menjadi VOID
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "VOID",
        voidedAt: new Date(),
      },
    });

    // 3. Kembalikan stok fisik untuk setiap item transaksi dan catat mutasi VOID
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockBalance: { increment: item.qty },
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          movementType: "VOID",
          quantity: item.qty, // Kuantitas positif untuk mengembalikan stok
          referenceType: "SALE",
          referenceId: sale.id,
          reason: `Pembatalan nota ${sale.receiptNo}: ${params.reason.trim()}`,
          createdBy: userId,
        },
      });
    }

    // 4. Catat Audit Log Pembatalan
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: "VOID",
        entityType: "SALE",
        entityId: sale.id,
        metadata: JSON.stringify({
          receiptNo: sale.receiptNo,
          grandTotal: sale.grandTotal,
          itemCount: sale.items.length,
          reason: params.reason.trim(),
        }),
      },
    });
  });

  revalidatePath("/transactions");
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return {
    success: true,
    message: "Transaksi berhasil dibatalkan dan stok telah dikembalikan.",
  };
}
