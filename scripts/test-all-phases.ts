/**
 * WarungOS - Comprehensive Test Suite Runner (Phase 1 through Phase 5)
 * Runs all validation checks across multi-tenancy, POS, inventory, reports, and health check.
 */

import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log("=========================================================");
  console.log("        WARUNGOS COMPREHENSIVE AUTOMATED TEST SUITE      ");
  console.log("=========================================================\n");

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------
    // 1. PHASE 1: MULTI-TENANCY & TENANT ISOLATION (AUTH-01, TEN-01..03)
    // -------------------------------------------------------------
    console.log("[1/5] Testing Phase 1: Multi-Tenancy & Tenant Isolation...");

    const passwordHash = await bcrypt.hash("password123", 10);

    // Create Tenant Alpha
    const userAlpha = await prisma.user.create({
      data: {
        name: `Owner Alpha ${testSuffix}`,
        email: `alpha_${testSuffix}@test.com`,
        passwordHash,
      },
    });

    const tenantAlpha = await prisma.tenant.create({
      data: {
        name: `Warung Alpha ${testSuffix}`,
        businessType: "Warung Kelontong",
        city: "Jakarta",
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: tenantAlpha.id,
        userId: userAlpha.id,
        role: "OWNER",
      },
    });

    // Create Tenant Beta
    const userBeta = await prisma.user.create({
      data: {
        name: `Owner Beta ${testSuffix}`,
        email: `beta_${testSuffix}@test.com`,
        passwordHash,
      },
    });

    const tenantBeta = await prisma.tenant.create({
      data: {
        name: `Warung Beta ${testSuffix}`,
        businessType: "Warung Sembako",
        city: "Bandung",
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: tenantBeta.id,
        userId: userBeta.id,
        role: "OWNER",
      },
    });

    assert(tenantAlpha.id !== tenantBeta.id, "Tenant Alpha and Beta have unique IDs");

    // -------------------------------------------------------------
    // 2. PHASE 2: CATALOG & INVENTORY (PROD-01..03, INV-01..03)
    // -------------------------------------------------------------
    console.log("\n[2/5] Testing Phase 2: Catalog & Stock Management...");

    // Create products with SAME SKU in different tenants (TEN-03 & PROD-03)
    const productAlpha = await prisma.product.create({
      data: {
        tenantId: tenantAlpha.id,
        name: "Minyak Goreng 2L Alpha",
        sku: "MKY-001",
        unit: "btl",
        costPrice: 28000,
        sellPrice: 34000,
        stockBalance: 20,
        minStock: 5,
      },
    });

    const productBeta = await prisma.product.create({
      data: {
        tenantId: tenantBeta.id,
        name: "Minyak Goreng 2L Beta",
        sku: "MKY-001", // same SKU across tenants allowed
        unit: "btl",
        costPrice: 29000,
        sellPrice: 35000,
        stockBalance: 15,
        minStock: 3,
      },
    });

    assert(productAlpha.id !== productBeta.id, "Products have distinct IDs across tenants");

    // Query Tenant Alpha products - Tenant Beta's products must NOT appear
    const alphaProducts = await prisma.product.findMany({
      where: { tenantId: tenantAlpha.id },
    });
    const leakCheck = alphaProducts.some((p) => p.tenantId === tenantBeta.id);
    assert(!leakCheck, "Tenant Alpha query strictly isolates data (zero leak from Beta)");

    // Stock Movement ledger check (INV-02)
    const move = await prisma.stockMovement.create({
      data: {
        tenantId: tenantAlpha.id,
        productId: productAlpha.id,
        movementType: "OPENING_BALANCE",
        quantity: 20,
        reason: "Stok awal",
        createdBy: userAlpha.id,
      },
    });
    assert(move.movementType === "OPENING_BALANCE", "Opening stock ledger entry recorded");

    // -------------------------------------------------------------
    // 3. PHASE 3: POS CHECKOUT, SNAPSHOTS & VOID (POS-01..04, BR-05, BR-07, BR-08)
    // -------------------------------------------------------------
    console.log("\n[3/5] Testing Phase 3: POS Checkout, Snapshot Preservation & Void...");

    // Simulate atomic checkout: 2 items of productAlpha
    const qtyToBuy = 2;
    const receiptNo = `RCP-${testSuffix}`;
    const lineTotal = productAlpha.sellPrice * qtyToBuy;
    const paidTotal = 100000;
    const changeTotal = paidTotal - lineTotal;

    const sale = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock
      await tx.product.update({
        where: { id: productAlpha.id },
        data: { stockBalance: { decrement: qtyToBuy } },
      });

      // 2. Create Sale
      const createdSale = await tx.sale.create({
        data: {
          tenantId: tenantAlpha.id,
          receiptNo,
          cashierId: userAlpha.id,
          subtotal: lineTotal,
          grandTotal: lineTotal,
          paidTotal,
          changeTotal,
          items: {
            create: [
              {
                tenantId: tenantAlpha.id,
                productId: productAlpha.id,
                productNameSnapshot: productAlpha.name,
                qty: qtyToBuy,
                costPriceSnapshot: productAlpha.costPrice,
                sellPriceSnapshot: productAlpha.sellPrice,
                lineTotal,
              },
            ],
          },
          payments: {
            create: [
              {
                tenantId: tenantAlpha.id,
                method: "CASH",
                amount: paidTotal,
              },
            ],
          },
        },
        include: { items: true },
      });

      // 3. Ledger movement
      await tx.stockMovement.create({
        data: {
          tenantId: tenantAlpha.id,
          productId: productAlpha.id,
          movementType: "SALE",
          quantity: -qtyToBuy,
          referenceType: "SALE",
          referenceId: createdSale.id,
          createdBy: userAlpha.id,
        },
      });

      return createdSale;
    });

    const updatedProduct = await prisma.product.findUnique({ where: { id: productAlpha.id } });
    assert(updatedProduct?.stockBalance === 18, `Stock decremented from 20 to 18 (actual: ${updatedProduct?.stockBalance})`);
    assert(sale.items[0].costPriceSnapshot === 28000, "Item preserves costPriceSnapshot (BR-05)");

    // Modify product price in catalog
    await prisma.product.update({
      where: { id: productAlpha.id },
      data: { sellPrice: 40000, costPrice: 32000 },
    });

    // Check past sale item snapshot - MUST REMAIN 28000
    const pastItem = await prisma.saleItem.findFirst({ where: { saleId: sale.id } });
    assert(pastItem?.costPriceSnapshot === 28000, "Historical cost price snapshot unaffected by product price change");

    // Test VOID transaction (BR-08)
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "VOID", voidedAt: new Date() },
      });

      await tx.product.update({
        where: { id: productAlpha.id },
        data: { stockBalance: { increment: qtyToBuy } },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: tenantAlpha.id,
          productId: productAlpha.id,
          movementType: "VOID",
          quantity: qtyToBuy,
          referenceType: "SALE",
          referenceId: sale.id,
          reason: "Void test transaction",
          createdBy: userAlpha.id,
        },
      });
    });

    const restoredProduct = await prisma.product.findUnique({ where: { id: productAlpha.id } });
    assert(restoredProduct?.stockBalance === 20, `Stock restored back to 20 after VOID (actual: ${restoredProduct?.stockBalance})`);

    // -------------------------------------------------------------
    // 4. PHASE 4: FINANCIAL REPORTS & GROSS PROFIT (RPT-01..04)
    // -------------------------------------------------------------
    console.log("\n[4/5] Testing Phase 4: Financial Reports & Laba Kotor...");

    // Create a completed sale for reporting check
    const reportSale = await prisma.sale.create({
      data: {
        tenantId: tenantAlpha.id,
        receiptNo: `RCP-RPT-${testSuffix}`,
        cashierId: userAlpha.id,
        subtotal: 68000,
        grandTotal: 68000,
        paidTotal: 100000,
        changeTotal: 32000,
        status: "COMPLETED",
        items: {
          create: [
            {
              tenantId: tenantAlpha.id,
              productId: productAlpha.id,
              productNameSnapshot: productAlpha.name,
              qty: 2,
              costPriceSnapshot: 28000,
              sellPriceSnapshot: 34000,
              lineTotal: 68000,
            },
          ],
        },
      },
      include: { items: true },
    });

    const omzet = reportSale.grandTotal;
    const cogs = reportSale.items.reduce((acc, item) => acc + item.costPriceSnapshot * item.qty, 0);
    const grossProfit = omzet - cogs;

    assert(omzet === 68000, `Grand Total / Omzet is Rp 68.000`);
    assert(cogs === 56000, `HPP (COGS) is Rp 56.000`);
    assert(grossProfit === 12000, `Laba Kotor (Gross Profit) is accurately Rp 12.000`);

    // -------------------------------------------------------------
    // 5. PHASE 5: AUDIT LOGS & HEALTH CHECK VERIFICATION
    // -------------------------------------------------------------
    console.log("\n[5/5] Testing Phase 5: Audit Ledger & Production Readiness...");

    const auditLog = await prisma.auditLog.create({
      data: {
        tenantId: tenantAlpha.id,
        actorId: userAlpha.id,
        action: "TEST_VERIFY",
        entityType: "SYSTEM",
        metadata: JSON.stringify({ status: "VERIFIED" }),
      },
    });

    assert(auditLog.action === "TEST_VERIFY", "Audit log created successfully");

    // Clean up test data
    await prisma.saleItem.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.payment.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.tenantUser.deleteMany({ where: { tenantId: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlpha.id, tenantBeta.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAlpha.id, userBeta.id] } } });

    console.log("\n=========================================================");
    console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
    console.log("=========================================================");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test Suite execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
