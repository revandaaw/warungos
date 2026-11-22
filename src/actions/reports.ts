"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant";

export interface ReportFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface DailySalesData {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Sen, 20 Nov"
  revenue: number;
  grossProfit: number;
  transactionCount: number;
}

export interface TopProductData {
  productId: string;
  name: string;
  unit: string;
  categoryName: string;
  qtySold: number;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export interface CategoryBreakdownData {
  categoryName: string;
  revenue: number;
  qtySold: number;
  percentage: number;
}

export interface FinancialReportResult {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalHpp: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalTransactions: number;
  averageOrderValue: number;
  dailyTrend: DailySalesData[];
  topProducts: TopProductData[];
  categoryBreakdown: CategoryBreakdownData[];
}

/**
 * RPT-01 & RPT-02, DASH-01, DASH-02:
 * Mengambil Laporan Keuangan, Omzet, HPP, dan Laba Kotor berdasarkan snapshot transaksi
 */
export async function getFinancialReportAction(
  filter?: ReportFilter
): Promise<FinancialReportResult> {
  const { tenantId } = await requireTenantContext();

  // Tentukan rentang tanggal (default: 30 hari terakhir)
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (filter?.startDate) {
    start = new Date(`${filter.startDate}T00:00:00.000Z`);
  } else {
    start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  if (filter?.endDate) {
    end = new Date(`${filter.endDate}T23:59:59.999Z`);
  }

  // 1. Ambil seluruh transaksi COMPLETED pada rentang tanggal tersebut
  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Kalkulasi Ringkasan Finansial
  let totalRevenue = 0;
  let totalHpp = 0;
  const productAggMap = new Map<string, TopProductData>();
  const categoryAggMap = new Map<string, { revenue: number; qtySold: number }>();
  const dailyAggMap = new Map<string, { revenue: number; grossProfit: number; count: number; dateObj: Date }>();

  // Inisialisasi peta tanggal
  const curr = new Date(start);
  while (curr <= end) {
    const dateStr = curr.toISOString().split("T")[0];
    dailyAggMap.set(dateStr, {
      revenue: 0,
      grossProfit: 0,
      count: 0,
      dateObj: new Date(curr),
    });
    curr.setDate(curr.getDate() + 1);
  }

  for (const s of sales) {
    totalRevenue += s.grandTotal;
    const saleDateStr = s.createdAt.toISOString().split("T")[0];

    let saleHpp = 0;

    for (const item of s.items) {
      const lineCost = item.costPriceSnapshot * item.qty;
      const lineProfit = item.lineTotal - lineCost;
      saleHpp += lineCost;

      // Agregasi per produk
      const existingProd = productAggMap.get(item.productId);
      const catName = item.product?.category?.name || "Umum";

      if (existingProd) {
        existingProd.qtySold += item.qty;
        existingProd.revenue += item.lineTotal;
        existingProd.cost += lineCost;
        existingProd.grossProfit += lineProfit;
      } else {
        productAggMap.set(item.productId, {
          productId: item.productId,
          name: item.productNameSnapshot,
          unit: item.product?.unit || "pcs",
          categoryName: catName,
          qtySold: item.qty,
          revenue: item.lineTotal,
          cost: lineCost,
          grossProfit: lineProfit,
        });
      }

      // Agregasi per kategori
      const existingCat = categoryAggMap.get(catName);
      if (existingCat) {
        existingCat.revenue += item.lineTotal;
        existingCat.qtySold += item.qty;
      } else {
        categoryAggMap.set(catName, {
          revenue: item.lineTotal,
          qtySold: item.qty,
        });
      }
    }

    totalHpp += saleHpp;

    // Masukkan ke tren harian
    const dayEntry = dailyAggMap.get(saleDateStr);
    if (dayEntry) {
      dayEntry.revenue += s.grandTotal;
      dayEntry.grossProfit += s.grandTotal - saleHpp;
      dayEntry.count += 1;
    }
  }

  const grossProfit = totalRevenue - totalHpp;
  const profitMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalTransactions = sales.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Format array tren harian
  const dailyTrend: DailySalesData[] = Array.from(dailyAggMap.entries()).map(([dateStr, data]) => ({
    date: dateStr,
    label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(data.dateObj),
    revenue: data.revenue,
    grossProfit: data.grossProfit,
    transactionCount: data.count,
  }));

  // Urutkan produk terlaris berdasarkan revenue
  const topProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Format breakdown kategori
  const categoryBreakdown: CategoryBreakdownData[] = Array.from(categoryAggMap.entries()).map(
    ([categoryName, data]) => ({
      categoryName,
      revenue: data.revenue,
      qtySold: data.qtySold,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })
  ).sort((a, b) => b.revenue - a.revenue);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    totalRevenue,
    totalHpp,
    grossProfit,
    profitMarginPercent,
    totalTransactions,
    averageOrderValue,
    dailyTrend,
    topProducts,
    categoryBreakdown,
  };
}

/**
 * Ekspor Data Transaksi ke Format CSV (Excel / Google Sheets Friendly)
 */
export async function exportTransactionsCsvAction(filter?: ReportFilter): Promise<string> {
  const { tenantId, tenantName } = await requireTenantContext();

  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      ...(filter?.startDate ? { createdAt: { gte: new Date(`${filter.startDate}T00:00:00.000Z`) } } : {}),
      ...(filter?.endDate ? { createdAt: { lte: new Date(`${filter.endDate}T23:59:59.999Z`) } } : {}),
    },
    include: {
      cashier: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

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

  const rows: string[] = [headers.join(",")];

  for (const s of sales) {
    const dateFormatted = new Date(s.createdAt).toLocaleString("id-ID");
    for (const item of s.items) {
      const lineCost = item.costPriceSnapshot * item.qty;
      const lineProfit = item.lineTotal - lineCost;

      const escapedName = `"${item.productNameSnapshot.replace(/"/g, '""')}"`;

      rows.push([
        s.receiptNo,
        `"${dateFormatted}"`,
        `"${s.cashier.name}"`,
        escapedName,
        item.qty,
        item.costPriceSnapshot,
        item.sellPriceSnapshot,
        item.lineTotal,
        lineCost,
        lineProfit,
      ].join(","));
    }
  }

  return rows.join("\n");
}
