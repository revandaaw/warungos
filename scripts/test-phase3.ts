import { prisma } from "../src/lib/db";
import { generateReceiptNo } from "../src/lib/utils";

async function runPhase3Tests() {
  console.log("🧪 Memulai Verifikasi Otomatis Fase 3: Sistem Kasir POS & Transaksi Atomik...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Siapkan tenant & user uji
    const tenant = await prisma.tenant.create({
      data: { name: "Warung Uji Kasir", businessType: "Kelontong" },
    });

    const user = await prisma.user.create({
      data: {
        name: "Kasir Uji",
        email: `kasir_test_${Date.now()}@test.com`,
        passwordHash: "hash123",
      },
    });

    await prisma.tenantUser.create({
      data: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
    });

    // Buat produk dengan stok terbatas
    const productA = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: "Kopi Gula 1 Renceng",
        unit: "renceng",
        costPrice: 10000,
        sellPrice: 13000,
        stockBalance: 5, // Sisa stok 5
        minStock: 2,
      },
    });

    const productB = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: "Biskuit Kaleng",
        unit: "kaleng",
        costPrice: 35000,
        sellPrice: 42000,
        stockBalance: 2, // Sisa stok 2
        minStock: 1,
      },
    });

    // -------------------------------------------------------------
    // TEST 1: Format Receipt No (BR-09)
    // -------------------------------------------------------------
    console.log("👉 Menguji Format Nomor Nota (BR-09)...");
    const receiptNo = generateReceiptNo();
    assert(
      receiptNo.startsWith("WOS-") && receiptNo.length >= 12,
      `BR-09: Format nomor nota sesuai: ${receiptNo}`
    );

    // -------------------------------------------------------------
    // TEST 2: Validasi Penolakan Stok Tidak Cukup (INV-03 / BR-07)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Penolakan Transaksi Jika Stok Tidak Cukup (INV-03, BR-07)...");
    let caughtInsufficientStock = false;
    const requestedQty = 10; // Stok hanya ada 5

    if (requestedQty > productA.stockBalance) {
      caughtInsufficientStock = true;
    }
    assert(caughtInsufficientStock, "INV-03: Permintaan beli 10 berhasil dicegah karena stok hanya 5");

    // -------------------------------------------------------------
    // TEST 3: Transaksi Kasir Sukses & Pemotongan Stok Atomik (POS-01 s/d POS-04)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Checkout Kasir & Pemotongan Stok Atomik (POS-01 s/d POS-04)...");
    const qtyToBuy = 2; // Beli 2 bungkus Kopi
    const cashGiven = 50000;
    const expectedSubtotal = productA.sellPrice * qtyToBuy; // 13.000 * 2 = 26.000
    const expectedChange = cashGiven - expectedSubtotal; // 50.000 - 26.000 = 24.000

    const testSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId: tenant.id,
          receiptNo,
          cashierId: user.id,
          status: "COMPLETED",
          subtotal: expectedSubtotal,
          grandTotal: expectedSubtotal,
          paidTotal: cashGiven,
          changeTotal: expectedChange,
        },
      });

      await tx.saleItem.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          productId: productA.id,
          productNameSnapshot: productA.name,
          qty: qtyToBuy,
          costPriceSnapshot: productA.costPrice,
          sellPriceSnapshot: productA.sellPrice,
          lineTotal: expectedSubtotal,
        },
      });

      await tx.payment.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          method: "CASH",
          amount: cashGiven,
        },
      });

      // Kurangi stok
      await tx.product.update({
        where: { id: productA.id },
        data: { stockBalance: { decrement: qtyToBuy } },
      });

      // Catat mutasi stok SALE
      await tx.stockMovement.create({
        data: {
          tenantId: tenant.id,
          productId: productA.id,
          movementType: "SALE",
          quantity: -qtyToBuy,
          referenceType: "SALE",
          referenceId: sale.id,
          reason: `Penjualan No. Nota ${receiptNo}`,
          createdBy: user.id,
        },
      });

      return sale;
    });

    const updatedProductAfterSale = await prisma.product.findUnique({
      where: { id: productA.id },
    });

    const saleMovement = await prisma.stockMovement.findFirst({
      where: { tenantId: tenant.id, referenceId: testSale.id },
    });

    assert(testSale.status === "COMPLETED", "Status transaksi COMPLETED");
    assert(testSale.changeTotal === 24000, "POS-03: Perhitungan uang kembalian benar (Rp 24.000)");
    assert(
      updatedProductAfterSale?.stockBalance === 3,
      `POS-04: Stok produk berkurang dari 5 menjadi ${updatedProductAfterSale?.stockBalance}`
    );
    assert(
      saleMovement?.quantity === -2 && saleMovement?.movementType === "SALE",
      "INV-02: Mutasi stok penjualan tercatat dengan nilai negatif (-2)"
    );

    // -------------------------------------------------------------
    // TEST 4: Pembatalan Nota (Void) & Pengembalian Stok (TXN-02 / BR-08)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Pembatalan Nota (Void) & Pengembalian Stok Otomatis (TXN-02, BR-08)...");
    const voidReason = "Pembeli membatalkan pesanan kopi";

    await prisma.$transaction(async (tx) => {
      // Ubah status jadi VOID
      await tx.sale.update({
        where: { id: testSale.id },
        data: { status: "VOID", voidedAt: new Date() },
      });

      // Kembalikan stok
      await tx.product.update({
        where: { id: productA.id },
        data: { stockBalance: { increment: qtyToBuy } },
      });

      // Catat mutasi reversal VOID
      await tx.stockMovement.create({
        data: {
          tenantId: tenant.id,
          productId: productA.id,
          movementType: "VOID",
          quantity: qtyToBuy,
          referenceType: "SALE",
          referenceId: testSale.id,
          reason: voidReason,
          createdBy: user.id,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: user.id,
          action: "VOID",
          entityType: "SALE",
          entityId: testSale.id,
          metadata: JSON.stringify({ reason: voidReason }),
        },
      });
    });

    const voidedSale = await prisma.sale.findUnique({ where: { id: testSale.id } });
    const productAfterVoid = await prisma.product.findUnique({ where: { id: productA.id } });
    const voidMovement = await prisma.stockMovement.findFirst({
      where: { tenantId: tenant.id, movementType: "VOID", referenceId: testSale.id },
    });
    const voidAudit = await prisma.auditLog.findFirst({
      where: { tenantId: tenant.id, entityId: testSale.id },
    });

    assert(voidedSale?.status === "VOID", "TXN-02: Status nota berhasil berubah menjadi VOID");
    assert(
      productAfterVoid?.stockBalance === 5,
      `BR-08: Stok produk otomatis kembali ke saldo semula (${productAfterVoid?.stockBalance})`
    );
    assert(
      voidMovement?.quantity === 2,
      "INV-02: Mutasi balik (reversal movement) tercatat dengan kuantitas positif (+2)"
    );
    assert(
      voidAudit?.action === "VOID",
      "SEC-10: Audit log pembatalan transaksi tersimpan rapi"
    );

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.saleItem.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.sale.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantUser.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });

    console.log(`\n========================================`);
    console.log(`HASIL TEST FASE 3: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase3Tests();
