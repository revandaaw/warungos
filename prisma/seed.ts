import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper generate receipt number
function generateReceipt(dayOffset: number, index: number): string {
  const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const pad = String(index).padStart(3, "0");
  return `WOS-${yy}${mm}${dd}-${pad}`;
}

// Helper date generator with hour offset
function getDateOffset(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Menjalankan Seeder Kaya Data WarungOS (Comprehensive Demo Data)...");

  // 1. Bersihkan database
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tenantUser.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  // 2. Buat Demo Users (Owner & Kasir)
  const passwordHash = await bcrypt.hash("password123", 10);
  
  const owner = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "owner@warungberkah.com",
      passwordHash,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: "Siti Rahmawati",
      email: "kasir@warungberkah.com",
      passwordHash,
    },
  });

  // 3. Buat Demo Warung (Tenant)
  const tenant = await prisma.tenant.create({
    data: {
      name: "Warung Berkah Mart",
      businessType: "Warung Sembako & Kelontong Modern",
      city: "Jakarta Selatan",
      timezone: "Asia/Jakarta",
      status: "ACTIVE",
    },
  });

  // 4. Hubungkan User ke Tenant
  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: owner.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: cashier.id,
      role: "CASHIER",
      status: "ACTIVE",
    },
  });

  // 5. Buat Kategori Realistis
  const categoriesData = [
    { name: "Sembako & Beras" },
    { name: "Mie & Makanan Instan" },
    { name: "Minuman Ringan & Dingin" },
    { name: "Kopi & Teh Sachet" },
    { name: "Bumbu Dapur & Minyak" },
    { name: "Makanan Ringan & Snack" },
    { name: "Kebutuhan Rumah Tangga" },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: tenant.id, name: cat.name, isActive: true },
    });
    catMap[cat.name] = created.id;
  }

  // 6. Katalog 24 Produk Realistis Warung Kelontong Indonesia
  const rawProducts = [
    // Sembako
    {
      name: "Beras Premium Ramos 5 kg",
      cat: "Sembako & Beras",
      sku: "BRS-RMS-05",
      unit: "karung",
      costPrice: 68000,
      sellPrice: 76000,
      stockBalance: 18,
      minStock: 5,
    },
    {
      name: "Gula Pasir Gulaku 1 kg",
      cat: "Sembako & Beras",
      sku: "GLK-PSR-01",
      unit: "kg",
      costPrice: 15500,
      sellPrice: 18000,
      stockBalance: 25,
      minStock: 8,
    },
    {
      name: "Telur Ayam Negeri 1 kg",
      cat: "Sembako & Beras",
      sku: "TLR-AYM-01",
      unit: "kg",
      costPrice: 26000,
      sellPrice: 29500,
      stockBalance: 14,
      minStock: 5,
    },
    {
      name: "Tepung Terigu Segitiga Biru 1 kg",
      cat: "Sembako & Beras",
      sku: "TPG-SGT-01",
      unit: "kg",
      costPrice: 11000,
      sellPrice: 13500,
      stockBalance: 20,
      minStock: 6,
    },

    // Bumbu & Minyak
    {
      name: "Minyak Goreng Filma 2 Liter",
      cat: "Bumbu Dapur & Minyak",
      sku: "MYK-FLM-02",
      unit: "pouch",
      costPrice: 32000,
      sellPrice: 36500,
      stockBalance: 22,
      minStock: 6,
    },
    {
      name: "Minyak Goreng Bimoli 1 Liter",
      cat: "Bumbu Dapur & Minyak",
      sku: "MYK-BML-01",
      unit: "pouch",
      costPrice: 16500,
      sellPrice: 19000,
      stockBalance: 3, // LOW STOCK
      minStock: 8,
    },
    {
      name: "Kecap Manis Bango 520 ml",
      cat: "Bumbu Dapur & Minyak",
      sku: "KCP-BNG-52",
      unit: "pouch",
      costPrice: 21000,
      sellPrice: 24500,
      stockBalance: 12,
      minStock: 4,
    },
    {
      name: "Royco Rasa Ayam 230g",
      cat: "Bumbu Dapur & Minyak",
      sku: "RYC-AYM-23",
      unit: "pouch",
      costPrice: 9500,
      sellPrice: 11500,
      stockBalance: 16,
      minStock: 5,
    },

    // Mie Instan
    {
      name: "Indomie Goreng Spesial 85g",
      cat: "Mie & Makanan Instan",
      sku: "IDM-GRG-85",
      unit: "pcs",
      costPrice: 2750,
      sellPrice: 3500,
      stockBalance: 65,
      minStock: 20,
    },
    {
      name: "Indomie Kuah Kari Ayam 72g",
      cat: "Mie & Makanan Instan",
      sku: "IDM-KRI-72",
      unit: "pcs",
      costPrice: 2700,
      sellPrice: 3500,
      stockBalance: 45,
      minStock: 15,
    },
    {
      name: "Mie Sedaap Goreng Original 90g",
      cat: "Mie & Makanan Instan",
      sku: "SDP-GRG-90",
      unit: "pcs",
      costPrice: 2650,
      sellPrice: 3500,
      stockBalance: 38,
      minStock: 15,
    },
    {
      name: "Pop Mie Rasa Ayam Bawang 75g",
      cat: "Mie & Makanan Instan",
      sku: "POP-ABW-75",
      unit: "cup",
      costPrice: 4500,
      sellPrice: 6000,
      stockBalance: 2, // LOW STOCK
      minStock: 10,
    },

    // Minuman
    {
      name: "Air Mineral Aqua Botol 600 ml",
      cat: "Minuman Ringan & Dingin",
      sku: "AQU-BTL-60",
      unit: "botol",
      costPrice: 2600,
      sellPrice: 3500,
      stockBalance: 48,
      minStock: 12,
    },
    {
      name: "Air Mineral Le Minerale 600 ml",
      cat: "Minuman Ringan & Dingin",
      sku: "LEM-BTL-60",
      unit: "botol",
      costPrice: 2500,
      sellPrice: 3500,
      stockBalance: 36,
      minStock: 12,
    },
    {
      name: "Teh Botol Sosro Kotak 250 ml",
      cat: "Minuman Ringan & Dingin",
      sku: "TB-KTK-250",
      unit: "kotak",
      costPrice: 3200,
      sellPrice: 4500,
      stockBalance: 24,
      minStock: 8,
    },
    {
      name: "Pocari Sweat Can 330 ml",
      cat: "Minuman Ringan & Dingin",
      sku: "PCR-SWT-33",
      unit: "kaleng",
      costPrice: 6200,
      sellPrice: 8000,
      stockBalance: 15,
      minStock: 6,
    },

    // Kopi & Teh Sachet
    {
      name: "Kopi Kapal Api Spesial Mix 24g",
      cat: "Kopi & Teh Sachet",
      sku: "KPL-MIX-24",
      unit: "sachet",
      costPrice: 1400,
      sellPrice: 2000,
      stockBalance: 80,
      minStock: 25,
    },
    {
      name: "Kopi Good Day Mocacinno 20g",
      cat: "Kopi & Teh Sachet",
      sku: "GDD-MOC-20",
      unit: "sachet",
      costPrice: 1500,
      sellPrice: 2500,
      stockBalance: 4, // LOW STOCK
      minStock: 20,
    },
    {
      name: "Torabika Cappuccino 25g",
      cat: "Kopi & Teh Sachet",
      sku: "TRB-CAP-25",
      unit: "sachet",
      costPrice: 1800,
      sellPrice: 2500,
      stockBalance: 50,
      minStock: 15,
    },

    // Snack
    {
      name: "Chitato Sapi Panggang 68g",
      cat: "Makanan Ringan & Snack",
      sku: "CHT-SPG-68",
      unit: "bungkus",
      costPrice: 9000,
      sellPrice: 11500,
      stockBalance: 18,
      minStock: 6,
    },
    {
      name: "Biskuit Roma Kelapa 300g",
      cat: "Makanan Ringan & Snack",
      sku: "RMA-KLP-30",
      unit: "bungkus",
      costPrice: 8500,
      sellPrice: 11000,
      stockBalance: 14,
      minStock: 5,
    },
    {
      name: "Beng-Beng Cokelat Wafer 25g",
      cat: "Makanan Ringan & Snack",
      sku: "BNG-WFR-25",
      unit: "pcs",
      costPrice: 1800,
      sellPrice: 2500,
      stockBalance: 60,
      minStock: 20,
    },

    // Kebutuhan Rumah Tangga
    {
      name: "Sunlight Jeruk Nipis 650 ml",
      cat: "Kebutuhan Rumah Tangga",
      sku: "SNL-JRK-65",
      unit: "pouch",
      costPrice: 13000,
      sellPrice: 16000,
      stockBalance: 16,
      minStock: 6,
    },
    {
      name: "Deterjen Rinso Molto Bubuk 770g",
      cat: "Kebutuhan Rumah Tangga",
      sku: "RNS-MLT-77",
      unit: "bungkus",
      costPrice: 22000,
      sellPrice: 26000,
      stockBalance: 2, // LOW STOCK
      minStock: 5,
    },
  ];

  const createdProducts: any[] = [];

  for (const item of rawProducts) {
    const p = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: catMap[item.cat],
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        stockBalance: item.stockBalance,
        minStock: item.minStock,
        isActive: true,
      },
    });

    createdProducts.push(p);

    // Ledger mutasi stok awal
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: p.id,
        movementType: "OPENING_BALANCE",
        quantity: item.stockBalance,
        referenceType: "MANUAL",
        reason: "Saldo stok awal pembukaan warung",
        createdBy: owner.id,
        createdAt: getDateOffset(7, 8, 0),
      },
    });
  }

  // 7. Catat 1 Penyesuaian Stok (SO & Barang Rusak) untuk memperkaya ledger inventori
  const bimoli = createdProducts.find((p) => p.sku === "MYK-BML-01");
  if (bimoli) {
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: bimoli.id,
        movementType: "ADJUSTMENT",
        quantity: -1,
        referenceType: "ADJUSTMENT",
        reason: "Barang rusak / bocor kemasan saat restock",
        createdBy: owner.id,
        createdAt: getDateOffset(3, 14, 30),
      },
    });
  }

  // 8. Buat 26 Riwayat Transaksi Penjualan realistis dalam 7 hari terakhir (Tren Grafik & Metrik Laporan Kaya)
  const salesHistoryPlan = [
    // H-6 (6 hari lalu) - 3 transaksi
    {
      dayOffset: 6, hour: 9, min: 15,
      items: [
        { sku: "IDM-GRG-85", qty: 5 },
        { sku: "AQU-BTL-60", qty: 3 },
      ],
      cashPaid: 50000,
    },
    {
      dayOffset: 6, hour: 13, min: 40,
      items: [
        { sku: "BRS-RMS-05", qty: 1 },
        { sku: "MYK-FLM-02", qty: 1 },
      ],
      cashPaid: 120000,
    },
    {
      dayOffset: 6, hour: 19, min: 10,
      items: [
        { sku: "KPL-MIX-24", qty: 10 },
        { sku: "BNG-WFR-25", qty: 4 },
      ],
      cashPaid: 50000,
    },

    // H-5 (5 hari lalu) - 4 transaksi
    {
      dayOffset: 5, hour: 8, min: 25,
      items: [
        { sku: "GLK-PSR-01", qty: 2 },
        { sku: "TPG-SGT-01", qty: 1 },
      ],
      cashPaid: 50000,
    },
    {
      dayOffset: 5, hour: 11, min: 15,
      items: [
        { sku: "IDM-KRI-72", qty: 4 },
        { sku: "TB-KTK-250", qty: 2 },
      ],
      cashPaid: 25000,
    },
    {
      dayOffset: 5, hour: 16, min: 45,
      items: [
        { sku: "CHT-SPG-68", qty: 2 },
        { sku: "PCR-SWT-33", qty: 2 },
      ],
      cashPaid: 40000,
    },
    {
      dayOffset: 5, hour: 20, min: 30,
      items: [
        { sku: "SNL-JRK-65", qty: 1 },
        { sku: "RNS-MLT-77", qty: 1 },
      ],
      cashPaid: 50000,
    },

    // H-4 (4 hari lalu) - 4 transaksi
    {
      dayOffset: 4, hour: 7, min: 50,
      items: [
        { sku: "TLR-AYM-01", qty: 2 },
        { sku: "MYK-BML-01", qty: 1 },
      ],
      cashPaid: 80000,
    },
    {
      dayOffset: 4, hour: 12, min: 10,
      items: [
        { sku: "SDP-GRG-90", qty: 6 },
        { sku: "LEM-BTL-60", qty: 4 },
      ],
      cashPaid: 50000,
    },
    {
      dayOffset: 4, hour: 15, min: 20,
      items: [
        { sku: "TRB-CAP-25", qty: 6 },
        { sku: "RMA-KLP-30", qty: 1 },
      ],
      cashPaid: 30000,
    },
    {
      dayOffset: 4, hour: 18, min: 35,
      items: [
        { sku: "BRS-RMS-05", qty: 1 },
        { sku: "KCP-BNG-52", qty: 1 },
      ],
      cashPaid: 110000,
    },

    // H-3 (3 hari lalu) - 4 transaksi
    {
      dayOffset: 3, hour: 9, min: 5,
      items: [
        { sku: "IDM-GRG-85", qty: 8 },
        { sku: "AQU-BTL-60", qty: 4 },
      ],
      cashPaid: 50000,
    },
    {
      dayOffset: 3, hour: 13, min: 15,
      items: [
        { sku: "MYK-FLM-02", qty: 2 },
        { sku: "GLK-PSR-01", qty: 1 },
      ],
      cashPaid: 100000,
    },
    {
      dayOffset: 3, hour: 17, min: 40,
      items: [
        { sku: "POP-ABW-75", qty: 3 },
        { sku: "TB-KTK-250", qty: 3 },
      ],
      cashPaid: 35000,
    },
    {
      dayOffset: 3, hour: 20, min: 10,
      items: [
        { sku: "GDD-MOC-20", qty: 8 },
        { sku: "BNG-WFR-25", qty: 6 },
      ],
      cashPaid: 40000,
    },

    // H-2 (2 hari lalu) - 4 transaksi
    {
      dayOffset: 2, hour: 8, min: 30,
      items: [
        { sku: "TLR-AYM-01", qty: 1 },
        { sku: "TPG-SGT-01", qty: 2 },
        { sku: "RYC-AYM-23", qty: 1 },
      ],
      cashPaid: 70000,
    },
    {
      dayOffset: 2, hour: 11, min: 50,
      items: [
        { sku: "BRS-RMS-05", qty: 1 },
        { sku: "MYK-FLM-02", qty: 1 },
        { sku: "GLK-PSR-01", qty: 1 },
      ],
      cashPaid: 150000,
    },
    {
      dayOffset: 2, hour: 15, min: 15,
      items: [
        { sku: "IDM-KRI-72", qty: 5 },
        { sku: "LEM-BTL-60", qty: 2 },
      ],
      cashPaid: 30000,
    },
    {
      dayOffset: 2, hour: 19, min: 45,
      items: [
        { sku: "CHT-SPG-68", qty: 3 },
        { sku: "PCR-SWT-33", qty: 2 },
      ],
      cashPaid: 60000,
    },

    // H-1 (Kemarin) - 4 transaksi
    {
      dayOffset: 1, hour: 9, min: 20,
      items: [
        { sku: "IDM-GRG-85", qty: 10 },
        { sku: "AQU-BTL-60", qty: 6 },
      ],
      cashPaid: 60000,
    },
    {
      dayOffset: 1, hour: 12, min: 45,
      items: [
        { sku: "BRS-RMS-05", qty: 2 },
        { sku: "TLR-AYM-01", qty: 1 },
      ],
      cashPaid: 200000,
    },
    {
      dayOffset: 1, hour: 16, min: 30,
      items: [
        { sku: "KPL-MIX-24", qty: 12 },
        { sku: "RMA-KLP-30", qty: 2 },
      ],
      cashPaid: 50000,
    },
    {
      dayOffset: 1, hour: 20, min: 15,
      items: [
        { sku: "SNL-JRK-65", qty: 2 },
        { sku: "KCP-BNG-52", qty: 1 },
      ],
      cashPaid: 60000,
    },

    // Hari Ini - 3 transaksi (2 COMPLETED, 1 VOID untuk demo fitur void)
    {
      dayOffset: 0, hour: 8, min: 15,
      items: [
        { sku: "TLR-AYM-01", qty: 1 },
        { sku: "GLK-PSR-01", qty: 1 },
        { sku: "MYK-BML-01", qty: 1 },
      ],
      cashPaid: 70000,
    },
    {
      dayOffset: 0, hour: 10, min: 45,
      items: [
        { sku: "IDM-GRG-85", qty: 4 },
        { sku: "IDM-KRI-72", qty: 3 },
        { sku: "TB-KTK-250", qty: 2 },
      ],
      cashPaid: 40000,
    },
    {
      dayOffset: 0, hour: 11, min: 30,
      isVoid: true,
      items: [
        { sku: "BRS-RMS-05", qty: 1 },
      ],
      cashPaid: 80000,
    },
  ];

  let receiptSeq = 1;
  for (const plan of salesHistoryPlan) {
    const saleDate = getDateOffset(plan.dayOffset, plan.hour, plan.min);
    const receiptNo = generateReceipt(plan.dayOffset, receiptSeq++);

    // Hitung subtotal dan item
    const resolvedItems: any[] = [];
    let subtotal = 0;

    for (const itemPlan of plan.items) {
      const prod = createdProducts.find((p) => p.sku === itemPlan.sku);
      if (prod) {
        const lineTotal = prod.sellPrice * itemPlan.qty;
        subtotal += lineTotal;
        resolvedItems.push({
          productId: prod.id,
          productNameSnapshot: prod.name,
          qty: itemPlan.qty,
          costPriceSnapshot: prod.costPrice,
          sellPriceSnapshot: prod.sellPrice,
          lineTotal,
        });
      }
    }

    const grandTotal = subtotal;
    const paidTotal = Math.max(plan.cashPaid, grandTotal);
    const changeTotal = paidTotal - grandTotal;
    const isVoid = (plan as any).isVoid === true;

    // Buat Sale
    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        receiptNo,
        cashierId: cashier.id,
        status: isVoid ? "VOID" : "COMPLETED",
        subtotal,
        discountTotal: 0,
        grandTotal,
        paidTotal,
        changeTotal,
        createdAt: saleDate,
        voidedAt: isVoid ? new Date(saleDate.getTime() + 15 * 60 * 1000) : null,
      },
    });

    // Buat Sale Items & Stock Movements
    for (const rItem of resolvedItems) {
      await prisma.saleItem.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          productId: rItem.productId,
          productNameSnapshot: rItem.productNameSnapshot,
          qty: rItem.qty,
          costPriceSnapshot: rItem.costPriceSnapshot,
          sellPriceSnapshot: rItem.sellPriceSnapshot,
          lineTotal: rItem.lineTotal,
        },
      });

      // Jika sale sukses, catat SALE movement
      await prisma.stockMovement.create({
        data: {
          tenantId: tenant.id,
          productId: rItem.productId,
          movementType: "SALE",
          quantity: -rItem.qty,
          referenceType: "SALE",
          referenceId: sale.id,
          createdBy: cashier.id,
          createdAt: saleDate,
        },
      });

      // Jika dibatalkan (VOID), catat pembalikan stok VOID movement
      if (isVoid) {
        await prisma.stockMovement.create({
          data: {
            tenantId: tenant.id,
            productId: rItem.productId,
            movementType: "VOID",
            quantity: rItem.qty,
            referenceType: "SALE",
            referenceId: sale.id,
            reason: "Pembatalan transaksi oleh pelanggan",
            createdBy: owner.id,
            createdAt: new Date(saleDate.getTime() + 15 * 60 * 1000),
          },
        });
      }
    }

    // Payment record
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        saleId: sale.id,
        method: "CASH",
        amount: paidTotal,
        paidAt: saleDate,
      },
    });
  }

  // 9. Tambah Audit Logs agar log audit di dashboard/settings terisi
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: owner.id,
      action: "CREATE",
      entityType: "TENANT",
      entityId: tenant.id,
      metadata: JSON.stringify({ name: tenant.name, city: tenant.city }),
      createdAt: getDateOffset(7, 8, 0),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: owner.id,
      action: "ADJUST_STOCK",
      entityType: "STOCK",
      metadata: JSON.stringify({ reason: "Barang rusak / bocor kemasan", qtyDelta: -1 }),
      createdAt: getDateOffset(3, 14, 30),
    },
  });

  console.log("=========================================================");
  console.log("🎉 Seeding Selesai! Data WarungOS Sekarang Sangat Kaya:");
  console.log(`   • ${categoriesData.length} Kategori Produk`);
  console.log(`   • ${rawProducts.length} Produk FMCG Terpopuler`);
  console.log(`   • 4 Produk Peringatan Stok Menipis (Low Stock Warning)`);
  console.log(`   • ${salesHistoryPlan.length} Transaksi Realistis (7 Hari Terakhir)`);
  console.log(`   • 1 Transaksi Status VOID (Demo Reversal)`);
  console.log("=========================================================");
  console.log("   Login Owner:  owner@warungberkah.com / password123");
  console.log("   Login Kasir:  kasir@warungberkah.com / password123");
  console.log("=========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
