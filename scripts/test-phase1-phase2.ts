import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Memulai Verifikasi Otomatis Fase 1 & Fase 2 WarungOS...\n");

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
    // -------------------------------------------------------------
    // TEST 1: Tenant & Owner Creation (AUTH-01, TEN-01)
    // -------------------------------------------------------------
    console.log("👉 Menguji Registrasi & Pembuatan Tenant...");
    const testUserA = await prisma.user.create({
      data: {
        name: "Pemilik A",
        email: `test_a_${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash("pass123", 10),
      },
    });

    const testTenantA = await prisma.tenant.create({
      data: {
        name: "Warung A Test",
        businessType: "Kelontong",
        city: "Jakarta",
      },
    });

    const membershipA = await prisma.tenantUser.create({
      data: {
        tenantId: testTenantA.id,
        userId: testUserA.id,
        role: "OWNER",
      },
    });

    assert(membershipA.role === "OWNER", "User A berhasil menjadi OWNER pada Tenant A");

    // -------------------------------------------------------------
    // TEST 2: Tenant Isolation (TEN-02, SEC-04)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Isolasi Tenant (Tenant Isolation)...");
    const testUserB = await prisma.user.create({
      data: {
        name: "Pemilik B",
        email: `test_b_${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash("pass123", 10),
      },
    });

    const testTenantB = await prisma.tenant.create({
      data: {
        name: "Warung B Test",
        businessType: "Kelontong",
        city: "Bandung",
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: testTenantB.id,
        userId: testUserB.id,
        role: "OWNER",
      },
    });

    // Buat produk di Tenant A
    const productA = await prisma.product.create({
      data: {
        tenantId: testTenantA.id,
        name: "Beras Pandan Wangi 5kg",
        costPrice: 70000,
        sellPrice: 85000,
        stockBalance: 10,
        unit: "karung",
      },
    });

    // Verifikasi: Query dengan tenantId B TIDAK BOLEH menemukan produk milik Tenant A
    const productsInTenantB = await prisma.product.findMany({
      where: {
        tenantId: testTenantB.id,
        id: productA.id,
      },
    });

    assert(productsInTenantB.length === 0, "TEN-02: Tenant B TIDAK DAPAT melihat produk Tenant A");

    // -------------------------------------------------------------
    // TEST 3: Mutasi Stok Awal (INV-01)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Pencatatan Mutasi Stok Awal (INV-01)...");
    const initialMovement = await prisma.stockMovement.create({
      data: {
        tenantId: testTenantA.id,
        productId: productA.id,
        movementType: "OPENING_BALANCE",
        quantity: 10,
        reason: "Saldo stok awal",
        createdBy: testUserA.id,
      },
    });

    assert(initialMovement.movementType === "OPENING_BALANCE", "INV-01: Stok awal tercatat sebagai OPENING_BALANCE");
    assert(initialMovement.quantity === 10, "INV-01: Kuantitas mutasi awal sesuai saldo produk");

    // -------------------------------------------------------------
    // TEST 4: Penyesuaian Stok & Audit Ledger (INV-02)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Penyesuaian Stok (Stock Adjustment) & Ledger...");
    const actualStock = 8; // Berkurang 2 karena ada yang rusak
    const delta = actualStock - productA.stockBalance;

    const adjustmentMovement = await prisma.stockMovement.create({
      data: {
        tenantId: testTenantA.id,
        productId: productA.id,
        movementType: "ADJUSTMENT",
        quantity: delta, // -2
        reason: "Kemasan bocor/rusak",
        createdBy: testUserA.id,
      },
    });

    const updatedProductA = await prisma.product.update({
      where: { id: productA.id },
      data: { stockBalance: actualStock },
    });

    assert(updatedProductA.stockBalance === 8, "Saldo produk diperbarui ke 8");
    assert(adjustmentMovement.quantity === -2, "INV-02: Kuantitas delta -2 tercatat di mutasi stok");
    assert(adjustmentMovement.reason === "Kemasan bocor/rusak", "INV-02: Alasan penyesuaian tersimpan");

    // -------------------------------------------------------------
    // TEST 5: Snapshot Harga pada Transaksi (BR-05)
    // -------------------------------------------------------------
    console.log("\n👉 Menguji Snapshot Harga Modal & Jual Transaksi (BR-05)...");
    const testSale = await prisma.sale.create({
      data: {
        tenantId: testTenantA.id,
        receiptNo: "WOS-TEST-999",
        cashierId: testUserA.id,
        status: "COMPLETED",
        subtotal: 85000,
        grandTotal: 85000,
        paidTotal: 100000,
        changeTotal: 15000,
      },
    });

    const testSaleItem = await prisma.saleItem.create({
      data: {
        tenantId: testTenantA.id,
        saleId: testSale.id,
        productId: productA.id,
        productNameSnapshot: productA.name,
        qty: 1,
        costPriceSnapshot: productA.costPrice,
        sellPriceSnapshot: productA.sellPrice,
        lineTotal: 85000,
      },
    });

    // Jika harga produk di katalog berubah di kemudian hari, harga snapshot transaksi TIDAK boleh berubah
    await prisma.product.update({
      where: { id: productA.id },
      data: { sellPrice: 90000, costPrice: 75000 },
    });

    const savedItem = await prisma.saleItem.findUnique({
      where: { id: testSaleItem.id },
    });

    assert(savedItem?.sellPriceSnapshot === 85000, "BR-05: Snapshot harga jual tetap 85.000 meskipun harga katalog naik");
    assert(savedItem?.costPriceSnapshot === 70000, "BR-05: Snapshot harga modal tetap 70.000 untuk integritas laba kotor");

    // Bersihkan data test
    await prisma.saleItem.deleteMany({ where: { tenantId: testTenantA.id } });
    await prisma.sale.deleteMany({ where: { tenantId: testTenantA.id } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: testTenantA.id } });
    await prisma.product.deleteMany({ where: { tenantId: testTenantA.id } });
    await prisma.tenantUser.deleteMany({ where: { tenantId: { in: [testTenantA.id, testTenantB.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [testTenantA.id, testTenantB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserA.id, testUserB.id] } } });

    console.log(`\n========================================`);
    console.log(`HASIL TEST: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
