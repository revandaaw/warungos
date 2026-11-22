"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import {
  TrendingUp,
  Coins,
  ReceiptText,
  ShoppingBag,
  Download,
  Calendar,
  AlertCircle,
  Package,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  FinancialReportResult,
  getFinancialReportAction,
  exportTransactionsCsvAction,
} from "@/actions/reports";

interface ReportsClientProps {
  initialReport: FinancialReportResult;
  tenantName: string;
}

export function ReportsClient({ initialReport, tenantName }: ReportsClientProps) {
  const [report, setReport] = useState<FinancialReportResult>(initialReport);
  const [periodPreset, setPeriodPreset] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [startDate, setStartDate] = useState(initialReport.startDate);
  const [endDate, setEndDate] = useState(initialReport.endDate);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter Presets
  const applyPreset = async (preset: "today" | "7d" | "30d") => {
    setPeriodPreset(preset);
    setLoading(true);

    const now = new Date();
    const endStr = now.toISOString().split("T")[0];
    let startStr = endStr;

    if (preset === "7d") {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startStr = past.toISOString().split("T")[0];
    } else if (preset === "30d") {
      const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startStr = past.toISOString().split("T")[0];
    }

    setStartDate(startStr);
    setEndDate(endStr);

    try {
      const res = await getFinancialReportAction({ startDate: startStr, endDate: endStr });
      setReport(res);
    } catch (err: any) {
      alert(err?.message || "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodPreset("custom");
    setLoading(true);

    try {
      const res = await getFinancialReportAction({ startDate, endDate });
      setReport(res);
    } catch (err: any) {
      alert(err?.message || "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvContent = await exportTransactionsCsvAction({ startDate, endDate });
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Laporan_Penjualan_${tenantName.replace(/\s+/g, "_")}_${startDate}_sd_${endDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err?.message || "Gagal mengekspor laporan.");
    } finally {
      setExporting(false);
    }
  };

  // Kalkulasi max omzet harian untuk scale bar grafik
  const maxDailyRevenue = Math.max(...report.dailyTrend.map((d) => d.revenue), 1000);

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Laporan Kinerja & Keuangan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Analisis omzet penjualan, HPP modal, laba kotor, dan produk terlaris di {tenantName}.
          </p>
        </div>

        <GlassButton
          variant="secondary"
          size="md"
          onClick={handleExportCsv}
          isLoading={exporting}
          className="border-white/10 hover:border-emerald-500/30 text-white"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Ekspor Laporan (CSV)</span>
        </GlassButton>
      </div>

      {/* Accounting Notice (PRD RPT-02) */}
      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Pedoman Akuntansi:</strong> Seluruh metrik menyajikan <strong>Laba Kotor (Gross Profit)</strong> berdasarkan snapshot harga modal per item saat transaksi kasir selesai. Biaya operasional warung (sewa, listrik, karyawan) belum dihitung.
        </span>
      </div>

      {/* Filter Periode */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Quick Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => applyPreset("today")}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                periodPreset === "today"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => applyPreset("7d")}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                periodPreset === "7d"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => applyPreset("30d")}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                periodPreset === "30d"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              30 Hari Terakhir
            </button>
          </div>

          {/* Custom Date Form */}
          <form onSubmit={handleCustomFilter} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Dari:</span>
              <GlassInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1.5 px-3 max-w-[145px]"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Sampai:</span>
              <GlassInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1.5 px-3 max-w-[145px]"
                required
              />
            </div>
            <GlassButton type="submit" variant="primary" size="sm" isLoading={loading}>
              Terapkan
            </GlassButton>
          </form>
        </div>
      </GlassCard>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Omzet Penjualan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatRupiah(report.totalRevenue)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari {report.totalTransactions} nota transaksi selesai
            </p>
          </div>
        </GlassCard>

        {/* Total Modal HPP */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total HPP (Modal Barang)</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] text-slate-300 border border-white/10 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-200 tracking-tight">
              {formatRupiah(report.totalHpp)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Berdasarkan snapshot modal saat penjualan
            </p>
          </div>
        </GlassCard>

        {/* Laba Kotor */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Laba Kotor (Gross Profit)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {formatRupiah(report.grossProfit)}
            </h3>
            <p className="text-[11px] text-emerald-300/80 mt-1">
              Margin keuntungan: {report.profitMarginPercent.toFixed(1)}%
            </p>
          </div>
        </GlassCard>

        {/* Rata-rata Belanja / AOV */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rata-rata Nota (AOV)</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] text-slate-300 border border-white/10 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatRupiah(report.averageOrderValue)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Rata-rata nilai belanja per pembeli
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Visual Chart: Tren Penjualan Harian */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Grafik Tren Omzet Harian</h3>
            <p className="text-[11px] text-slate-400">
              Perkembangan omzet per hari pada periode {report.startDate} s/d {report.endDate}
            </p>
          </div>
        </div>

        {/* Pure CSS/SVG Glass Bar Chart */}
        <div className="pt-6 pb-2">
          {report.dailyTrend.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Belum ada riwayat transaksi pada rentang ini.
            </div>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2 h-44 overflow-x-auto pb-4 pt-2">
              {report.dailyTrend.map((day, idx) => {
                const heightPercent = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;
                const barHeight = Math.max(heightPercent, 4); // Minimal 4% agar tetap terlihat

                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-14 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className="bg-[#0B0F17] border border-white/20 text-[10px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap">
                        <div className="font-bold">{day.label}</div>
                        <div className="text-emerald-400">Omzet: {formatRupiah(day.revenue)}</div>
                        <div className="text-slate-400">Laba: {formatRupiah(day.grossProfit)}</div>
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#0B0F17] rotate-45 border-r border-b border-white/20 -mt-1" />
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        day.revenue > 0
                          ? "bg-emerald-500/30 group-hover:bg-emerald-500/50 border-t border-x border-emerald-400/40"
                          : "bg-white/[0.02]"
                      }`}
                    />

                    {/* X-axis Label */}
                    <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">
                      {day.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Grid: Produk Terlaris & Breakdown Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabel 10 Produk Terlaris */}
        <div className="lg:col-span-8">
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">10 Produk Paling Laris</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Berdasarkan Total Nilai Penjualan</span>
            </div>

            {report.topProducts.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Belum ada produk yang terjual pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/[0.06] text-[11px]">
                      <th className="py-2.5 font-bold">#</th>
                      <th className="py-2.5 font-bold">Produk</th>
                      <th className="py-2.5 font-bold text-center">Terjual</th>
                      <th className="py-2.5 font-bold text-right">Omzet</th>
                      <th className="py-2.5 font-bold text-right">Laba Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {report.topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5">
                          <span className="font-semibold text-white block">{p.name}</span>
                          <span className="text-[10px] text-slate-400">{p.categoryName}</span>
                        </td>
                        <td className="py-2.5 text-center font-bold text-white">
                          {p.qtySold} {p.unit}
                        </td>
                        <td className="py-2.5 text-right font-bold text-white">
                          {formatRupiah(p.revenue)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          +{formatRupiah(p.grossProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Breakdown Penjualan per Kategori */}
        <div className="lg:col-span-4">
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Penjualan per Kategori</h3>
            </div>

            {report.categoryBreakdown.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Belum ada data kategori.
              </div>
            ) : (
              <div className="space-y-3">
                {report.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">{cat.categoryName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatRupiah(cat.revenue)} ({cat.percentage.toFixed(0)}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
