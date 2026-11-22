"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext, requireRole } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * INV-02 & INV-03: Penyesuaian Stok Manual (Stock Adjustment)
 * Setiap penambahan/pengurangan mempunyai tipe, kuantitas, waktu, pengguna, alasan, dan tenant.
 */
export async function adjustStockAction(params: {
  productId: string;
  actualStock: number;
  reason: string;
}) {
  const { tenantId, userId } = await requireRole(["OWNER", "STAFF"]);
  const { productId, actualStock, reason } = params;

  if (actualStock < 0) {
    throw new Error("Stok fisik tidak boleh bernilai negatif.");
  }
  if (!reason?.trim()) {
    throw new Error("Alasan penyesuaian stok wajib dicatat (misal: Rusak, Kadaluarsa, Selisih Hitung).");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Ambil produk dan pastikan milik tenant aktif
    const product = await tx.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new Error("Produk tidak ditemukan.");
    }

    const currentStock = product.stockBalance;
    const delta = actualStock - currentStock;

    if (delta === 0) {
      return { product, delta: 0, message: "Jumlah stok tidak berubah." };
    }

    // 2. Buat catatan mutasi stok
    await tx.stockMovement.create({
      data: {
        tenantId,
        productId,
        movementType: "ADJUSTMENT",
        quantity: delta,
        referenceType: "MANUAL",
        reason: reason.trim(),
        createdBy: userId,
      },
    });

    // 3. Update saldo stok di produk
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        stockBalance: actualStock,
      },
    });

    // 4. Catat Audit Log
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: "ADJUST_STOCK",
        entityType: "STOCK",
        entityId: productId,
        metadata: JSON.stringify({
          productName: product.name,
          previousStock: currentStock,
          newStock: actualStock,
          delta,
          reason,
        }),
      },
    });

    return { product: updatedProduct, delta };
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}

/**
 * Ambil riwayat mutasi stok untuk tenant
 */
export async function getStockMovementsAction(productId?: string) {
  const { tenantId } = await requireTenantContext();

  return prisma.stockMovement.findMany({
    where: {
      tenantId,
      ...(productId ? { productId } : {}),
    },
    include: {
      product: { select: { id: true, name: true, unit: true, sku: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/**
 * Ambil ringkasan inventaris: total item, nilai stok (harga modal * stok), stok menipis
 */
export async function getInventorySummaryAction() {
  const { tenantId } = await requireTenantContext();

  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: { category: true },
  });

  let totalItems = products.length;
  let totalStockQuantity = 0;
  let totalStockValue = 0; // HPP valuation
  const lowStockProducts = [];

  for (const p of products) {
    totalStockQuantity += p.stockBalance;
    totalStockValue += p.stockBalance * p.costPrice;
    if (p.minStock > 0 && p.stockBalance <= p.minStock) {
      lowStockProducts.push(p);
    }
  }

  return {
    totalItems,
    totalStockQuantity,
    totalStockValue,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    products,
  };
}
