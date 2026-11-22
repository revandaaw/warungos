import React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Plus,
  ArrowRight,
  Package,
  BarChart3,
} from "lucide-react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { formatRupiah, formatDate } from "@/lib/utils";
import { getFinancialReportAction } from "@/actions/reports";

export default async function DashboardPage() {
  const { tenantId, tenantName } = await requireTenantContext();

  // 1. Ambil data produk & stok
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { category: true },
  });

  const lowStockProducts = products.filter(
    (p) => p.isActive && p.minStock > 0 && p.stockBalance <= p.minStock
  );

  // 2. Ambil laporan 7 hari terakhir untuk grafik tren
  const report7d = await getFinancialReportAction({
    startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // 3. Ambil transaksi hari ini (DASH-01, DASH-02)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySales = await prisma.sale.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: todayStart },
    },
    include: {
      items: true,
    },
  });

  let todayRevenue = 0;
  let todayHpp = 0;
  for (const sale of todaySales) {
    todayRevenue += sale.grandTotal;
    for (const item of sale.items) {
      todayHpp += item.costPriceSnapshot * item.qty;
    }
  }
  const todayGrossProfit = todayRevenue - todayHpp;

  // 4. Mutasi stok terbaru
  const recentMovements = await prisma.stockMovement.findMany({
    where: { tenantId },
    include: {
      product: { select: { name: true, unit: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const maxRevenue7d = Math.max(...report7d.dailyTrend.map((d) => d.revenue), 1000);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Dashboard {tenantName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ringkasan penjualan harian, status stok, dan kinerja usaha warung Anda.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/pos">
            <GlassButton variant="primary" size="md">
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Kasir</span>
            </GlassButton>
          </Link>
          <Link href="/products">
            <GlassButton variant="secondary" size="md">
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omzet Hari Ini */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Omzet Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatRupiah(todayRevenue)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari {todaySales.length} transaksi kasir selesai
            </p>
          </div>
        </GlassCard>

        {/* Laba Kotor Hari Ini */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Laba Kotor (Hari Ini)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {formatRupiah(todayGrossProfit)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Omzet dikurangi modal HPP produk
            </p>
          </div>
        </GlassCard>

        {/* Total Katalog Produk */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Katalog Produk</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] text-slate-300 border border-white/10 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {products.length} <span className="text-sm font-normal text-slate-400">item</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {products.filter((p) => p.isActive).length} produk aktif dijual
            </p>
          </div>
        </GlassCard>

        {/* Stok Menipis */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Peringatan Stok</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${lowStockProducts.length > 0 ? "text-amber-400" : "text-white"}`}>
              {lowStockProducts.length} <span className="text-sm font-normal text-slate-400">produk</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {lowStockProducts.length > 0 ? "Perlu segera diisi ulang" : "Semua stok aman"}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Mini Chart Tren 7 Hari Terakhir */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Tren Omzet 7 Hari Terakhir</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Total omzet 7 hari: <strong className="text-white">{formatRupiah(report7d.totalRevenue)}</strong> • Laba kotor: <strong className="text-emerald-400">+{formatRupiah(report7d.grossProfit)}</strong>
            </p>
          </div>
          <Link href="/reports" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
            Laporan Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-end gap-2 h-28 pt-2">
          {report7d.dailyTrend.map((day, idx) => {
            const heightPercent = maxRevenue7d > 0 ? (day.revenue / maxRevenue7d) * 100 : 0;
            const barHeight = Math.max(heightPercent, 5);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-[#0B0F17] border border-white/20 text-[10px] text-white px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                    {day.label}: {formatRupiah(day.revenue)}
                  </div>
                </div>

                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-t transition-all duration-200 ${
                    day.revenue > 0
                      ? "bg-emerald-500/30 group-hover:bg-emerald-500/50 border-t border-emerald-400/40"
                      : "bg-white/[0.03]"
                  }`}
                />
                <span className="text-[9px] text-slate-500 mt-1.5">{day.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Grid: Stok Menipis & Aktivitas Mutasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stok Menipis List */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Produk Stok Menipis</h2>
            </div>
            <Link href="/inventory" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              Lihat Stok <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p>Tidak ada stok yang berada di bawah batas minimum.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{product.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      Batas min: {product.minStock} {product.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">
                      Sisa {product.stockBalance} {product.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Aktivitas Mutasi Stok Terakhir */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Mutasi Stok Terbaru</h2>
            </div>
            <Link href="/inventory" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              Riwayat Lengkap <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p>Belum ada pergerakan stok tercatat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((movement) => {
                const isPositive = movement.quantity > 0;
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {movement.product.name}
                        </span>
                        <GlassBadge
                          size="sm"
                          variant={movement.movementType === "OPENING_BALANCE" ? "primary" : isPositive ? "success" : "danger"}
                        >
                          {movement.movementType}
                        </GlassBadge>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {movement.reason || "Penyesuaian stok"} • {formatDate(movement.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? `+${movement.quantity}` : movement.quantity} {movement.product.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
