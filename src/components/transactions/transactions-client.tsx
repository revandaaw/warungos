"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";
import {
  ReceiptText,
  Search,
  AlertTriangle,
  RotateCcw,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { voidSaleAction } from "@/actions/pos";

interface SaleItemDetail {
  id: string;
  productNameSnapshot: string;
  qty: number;
  costPriceSnapshot: number;
  sellPriceSnapshot: number;
  lineTotal: number;
}

interface SaleData {
  id: string;
  receiptNo: string;
  status: string;
  grandTotal: number;
  paidTotal: number;
  changeTotal: number;
  createdAt: Date | string;
  voidedAt: Date | string | null;
  cashier: { name: string };
  items: SaleItemDetail[];
}

interface TransactionsClientProps {
  initialSales: SaleData[];
  userRole: string;
}

export function TransactionsClient({
  initialSales,
  userRole,
}: TransactionsClientProps) {
  const [sales, setSales] = useState<SaleData[]>(initialSales);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Detail Modal
  const [selectedSale, setSelectedSale] = useState<SaleData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Void Modal
  const [saleToVoid, setSaleToVoid] = useState<SaleData | null>(null);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDetail = (sale: SaleData) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const openVoidModal = (sale: SaleData) => {
    setSaleToVoid(sale);
    setVoidReason("");
    setError(null);
    setIsVoidOpen(true);
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToVoid) return;

    setLoading(true);
    setError(null);

    try {
      await voidSaleAction({
        saleId: saleToVoid.id,
        reason: voidReason,
      });

      // Update state status to VOID
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleToVoid.id
            ? { ...s, status: "VOID", voidedAt: new Date().toISOString() }
            : s
        )
      );

      setIsVoidOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal membatalkan transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchesStatus = filterStatus === "ALL" || s.status === filterStatus;
    const matchesSearch =
      s.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
      s.cashier.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const isOwner = userRole === "OWNER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Riwayat Transaksi Penjualan</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Daftar seluruh nota penjualan, rincian belanja, dan pembatalan transaksi (*void*).
        </p>
      </div>

      {/* Filter and Search */}
      <GlassCard className="p-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <GlassInput
              placeholder="Cari berdasarkan No. Nota (WOS-...) atau nama kasir..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {["ALL", "COMPLETED", "VOID"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {status === "ALL" ? "Semua Nota" : status}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* List Transaksi */}
      {filteredSales.length === 0 ? (
        <GlassCard className="p-12 text-center text-xs text-slate-400">
          <ReceiptText className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-40" />
          <p>Tidak ada transaksi ditemukan.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => {
            const isCompleted = sale.status === "COMPLETED";

            return (
              <GlassCard
                key={sale.id}
                className={`p-4 transition-all duration-150 ${
                  !isCompleted ? "opacity-60 bg-red-950/10 border-red-500/15" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      <ReceiptText className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {sale.receiptNo}
                        </span>
                        <GlassBadge
                          size="sm"
                          variant={isCompleted ? "success" : "danger"}
                        >
                          {sale.status}
                        </GlassBadge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(sale.createdAt)} • Kasir: {sale.cashier.name} • {sale.items.length} jenis item
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-black text-white">
                        {formatRupiah(sale.grandTotal)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tunai: {formatRupiah(sale.paidTotal)} (Kembali: {formatRupiah(sale.changeTotal)})
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => openDetail(sale)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </GlassButton>

                      {isCompleted && isOwner && (
                        <GlassButton
                          size="sm"
                          variant="danger"
                          onClick={() => openVoidModal(sale)}
                          title="Batalkan Nota & Kembalikan Stok"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Void</span>
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      <GlassModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Rincian Nota: ${selectedSale?.receiptNo}`}
        description={`Status: ${selectedSale?.status} • Tanggal: ${formatDate(selectedSale?.createdAt)}`}
        maxWidth="md"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="divide-y divide-white/[0.08] max-h-64 overflow-y-auto pr-1">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">
                      {item.productNameSnapshot}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.qty} x {formatRupiah(item.sellPriceSnapshot)} (Modal: {formatRupiah(item.costPriceSnapshot)})
                    </span>
                  </div>
                  <div className="font-bold text-white text-right">
                    {formatRupiah(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] space-y-1 text-xs">
              <div className="flex justify-between font-bold text-white">
                <span>Total Belanja:</span>
                <span className="text-emerald-400">{formatRupiah(selectedSale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Uang Diterima:</span>
                <span>{formatRupiah(selectedSale.paidTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Kembalian:</span>
                <span>{formatRupiah(selectedSale.changeTotal)}</span>
              </div>
              {selectedSale.voidedAt && (
                <div className="pt-2 text-[10px] text-red-400 font-semibold">
                  Dibatalkan pada: {formatDate(selectedSale.voidedAt)}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/[0.08]">
              <GlassButton variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Tutup
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* VOID CONFIRMATION MODAL */}
      <GlassModal
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        title="Konfirmasi Pembatalan Transaksi (Void)"
        description={`Nota: ${saleToVoid?.receiptNo} (Total: ${formatRupiah(saleToVoid?.grandTotal)})`}
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVoidSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Perhatian:
            </p>
            <p className="text-[11px] text-red-300/80 leading-relaxed">
              Pembatalan tidak akan menghapus data transaksi. Status nota akan diubah menjadi <strong>VOID</strong>, dan seluruh stok barang pada nota ini akan otomatis <strong>dikembalikan ke saldo persediaan</strong> melalui mutasi stok baru.
            </p>
          </div>

          <GlassInput
            label="Alasan Pembatalan Transaksi *"
            placeholder="Contoh: Pembeli salah beli barang, Transaksi uji coba, dll."
            helperText="Wajib dicatat untuk pertanggungjawaban audit log"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <GlassButton type="button" variant="ghost" onClick={() => setIsVoidOpen(false)}>
              Batal
            </GlassButton>
            <GlassButton type="submit" variant="danger" isLoading={loading}>
              Konfirmasi Batalkan Nota
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
