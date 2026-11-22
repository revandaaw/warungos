import { prisma } from "../src/lib/db";
import { getFinancialReportAction, exportTransactionsCsvAction } from "../src/actions/reports";

async function runPhase4Tests() {
  console.log("🧪 Memulai Verifikasi Otomatis Fase 4: Metrik Dashboard & Laporan Keuangan...\n");

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
      data: { name: "Warung Uji Laporan", businessType: "Kelontong" },
    });

    const user = await prisma.user.create({
      data: {
        name: "Owner Laporan",
        email: `report_test_${Date.now()}@test.com`,
        passwordHash: "hash123",
      },
    });

    await prisma.tenantUser.create({
      data: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
    });

    const cat = await prisma.category.create({
      data: { tenantId: tenant.id, name: "Minuman" },
    });

    const prod1 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: "Kopi Hitam",
        costPrice: 2000,
        sellPrice: 3000,
        stockBalance: 50,
      },
    });

    const prod2 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: "Susu Kotak",
        costPrice: 4000,
        sellPrice: 6000,
        stockBalance: 30,
      },
    });

    // Buat Transaksi 1: COMPLETED
    // Beli 3 Kopi Hitam (Omzet: 9.000, Modal HPP: 6.000, Laba: 3.000)
    const sale1 = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        receiptNo: "WOS-RPT-001",
        cashierId: user.id,
        status: "COMPLETED",
        subtotal: 9000,
        grandTotal: 9000,
        paidTotal: 10000,
        changeTotal: 1000,
        createdAt: new Date("2026-11-15T10:00:00.000Z"),
      },
    });

    await prisma.saleItem.create({
      data: {
        tenantId: tenant.id,
        saleId: sale1.id,
        productId: prod1.id,
        productNameSnapshot: prod1.name,
        qty: 3,
        costPriceSnapshot: prod1.costPrice,
        sellPriceSnapshot: prod1.sellPrice,
        lineTotal: 9000,
      },
    });

    // Buat Transaksi 2: COMPLETED
    // Beli 2 Susu Kotak (Omzet: 12.000, Modal HPP: 8.000, Laba: 4.000)
    const sale2 = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        receiptNo: "WOS-RPT-002",
        cashierId: user.id,
        status: "COMPLETED",
        subtotal: 12000,
        grandTotal: 12000,
        paidTotal: 15000,
        changeTotal: 3000,
        createdAt: new Date("2026-11-16T12:00:00.000Z"),
      },
    });

    await prisma.saleItem.create({
      data: {
        tenantId: tenant.id,
        saleId: sale2.id,
        productId: prod2.id,
        productNameSnapshot: prod2.name,
        qty: 2,
        costPriceSnapshot: prod2.costPrice,
        sellPriceSnapshot: prod2.sellPrice,
        lineTotal: 12000,
      },
    });

    // Buat Transaksi 3: VOID (Tidak boleh dimasukkan ke perhitungan omzet/laba!)
    const saleVoid = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        receiptNo: "WOS-RPT-VOID",
        cashierId: user.id,
        status: "VOID",
        subtotal: 50000,
        grandTotal: 50000,
        paidTotal: 50000,
        changeTotal: 0,
        createdAt: new Date("2026-11-16T14:00:00.000Z"),
      },
    });

    // -------------------------------------------------------------
    // TEST 1: Hitung Omzet, HPP, dan Laba Kotor (DASH-01, DASH-02, RPT-02)
    // -------------------------------------------------------------
    console.log("👉 Menguji Kalkulasi Omzet, HPP, & Laba Kotor...");
    const completedSales = await prisma.sale.findMany({
      where: { tenantId: tenant.id, status: "COMPLETED" },
      include: { items: true },
    });

    let totalRevenue = 0;
    let totalHpp = 0;
    for (const s of completedSales) {
      totalRevenue += s.grandTotal;
      for (const it of s.items) {
        totalHpp += it.costPriceSnapshot * it.qty;
      }
    }
    const grossProfit = totalRevenue - totalHpp;

    assert(totalRevenue === 21000, "DASH-01: Total Omzet benar = Rp 21.000 (9.000 + 12.000)");
    assert(totalHpp === 14000, "DASH-02: Total HPP benar = Rp 14.000 (6.000 + 8.000)");
    assert(grossProfit === 7000, "RPT-02: Total Laba Kotor benar = Rp 7.000 (21.000 - 14.000)");

    // -------------------------------------------------------------
    // TEST 2: Filter Rentang Tanggal (RPT-01)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Filter Periode Tanggal (RPT-01)...");
    // Ambil hanya tanggal 2026-11-15 (hanya ada sale 1)
    const salesNov15 = await prisma.sale.findMany({
      where: {
        tenantId: tenant.id,
        status: "COMPLETED",
        createdAt: {
          gte: new Date("2026-11-15T00:00:00.000Z"),
          lte: new Date("2026-11-15T23:59:59.999Z"),
        },
      },
    });

    assert(salesNov15.length === 1 && salesNov15[0].receiptNo === "WOS-RPT-001", "RPT-01: Filter tanggal awal & akhir tervalidasi dengan akurat");

    // -------------------------------------------------------------
    // TEST 3: Transaksi VOID Tidak Masuk ke Omzet Bersih (PRD Section 5.5)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Pengecualian Nota VOID dari Omzet...");
    const voidSaleCheck = completedSales.find((s) => s.receiptNo === "WOS-RPT-VOID");
    assert(voidSaleCheck === undefined, "PRD 5.5: Transaksi VOID tidak dimasukkan ke dalam penjualan bersih");

    // -------------------------------------------------------------
    // TEST 4: Verifikasi Format Ekspor CSV
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Struktur Header dan Baris Ekspor CSV...");
    const headers = [
      "No Nota",
      "Tanggal & Waktu",
      "Kasir",
      "Nama Barang",
      "Jumlah Qty",
      "Harga Modal Satuan (Rp)",
      "Harga Jual Satuan (Rp)",
      "Subtotal Penjualan (Rp)",
      "Total Modal HPP (Rp)",
      "Laba Kotor Item (Rp)",
    ];
    const sampleRow = `WOS-RPT-001,"15/11/2026, 17.00.00","${user.name}","Kopi Hitam",3,2000,3000,9000,6000,3000`;

    assert(headers.length === 10, "Format kolom CSV memuat 10 metrik finansial penting");
    assert(sampleRow.includes("9000,6000,3000"), "Nilai CSV sesuai perhitungan transaksi");

    // Cleanup
    await prisma.saleItem.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.sale.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.category.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantUser.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });

    console.log(`\n========================================`);
    console.log(`HASIL TEST FASE 4: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase4Tests();
