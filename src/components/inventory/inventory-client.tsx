"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";
import {
  Boxes,
  TrendingDown,
  SlidersHorizontal,
  AlertCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { adjustStockAction } from "@/actions/inventory";

interface ProductStockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockBalance: number;
  minStock: number;
  category: { name: string } | null;
}

interface StockMovementItem {
  id: string;
  movementType: string;
  quantity: number;
  reason: string | null;
  createdAt: Date | string;
  product: { id: string; name: string; unit: string; sku: string | null };
  creator: { name: string } | null;
}

interface InventoryClientProps {
  initialProducts: ProductStockItem[];
  initialMovements: StockMovementItem[];
  totalStockValue: number;
  totalStockQuantity: number;
  lowStockCount: number;
}

export function InventoryClient({
  initialProducts,
  initialMovements,
  totalStockValue,
  totalStockQuantity,
  lowStockCount,
}: InventoryClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [movements, setMovements] = useState(initialMovements);
  const [activeTab, setActiveTab] = useState<"balances" | "movements">("balances");
  const [search, setSearch] = useState("");

  // Adjustment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockItem | null>(null);
  const [actualStock, setActualStock] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdjustmentModal = (product: ProductStockItem) => {
    setSelectedProduct(product);
    setActualStock(product.stockBalance);
    setReason("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setLoading(true);
    setError(null);

    try {
      const res = await adjustStockAction({
        productId: selectedProduct.id,
        actualStock: Number(actualStock),
        reason,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id ? { ...p, stockBalance: Number(actualStock) } : p
        )
      );

      const newMovement: StockMovementItem = {
        id: Math.random().toString(),
        movementType: "ADJUSTMENT",
        quantity: res.delta,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          unit: selectedProduct.unit,
          sku: selectedProduct.sku,
        },
        creator: { name: "Anda" },
      };
      setMovements((prev) => [newMovement, ...prev]);

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal menyesuaikan stok.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Persediaan & Stok Barang</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Pantau stok fisik barang, lakukan stock opname, dan telusuri riwayat mutasi stok.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Unit Stok</span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {totalStockQuantity}{" "}
              <span className="text-xs font-normal text-slate-400">unit</span>
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Estimasi Nilai Modal Stok</span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {formatRupiah(totalStockValue)}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Stok di Bawah Batas Minimum</span>
            <h3 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight mt-0.5">
              {lowStockCount}{" "}
              <span className="text-xs font-normal text-slate-400">produk</span>
            </h3>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] gap-4">
        <button
          onClick={() => setActiveTab("balances")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "balances" ? "text-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Saldo Stok Fisik</span>
          {activeTab === "balances" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "movements" ? "text-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Buku Catatan Mutasi Stok ({movements.length})</span>
          {activeTab === "movements" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          )}
        </button>
      </div>

      {/* Tab 1: Saldo Stok */}
      {activeTab === "balances" && (
        <div className="space-y-4">
          <GlassCard className="p-3">
            <GlassInput
              placeholder="Cari barang untuk penyesuaian stok..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </GlassCard>

          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#0B0F17]/60 backdrop-blur-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold text-slate-400 bg-white/[0.02]">
                <div className="col-span-4">Produk</div>
                <div className="col-span-2">Kategori</div>
                <div className="col-span-2 text-center">Batas Min</div>
                <div className="col-span-2 text-right">Saldo Stok</div>
                <div className="col-span-2 text-right">Aksi</div>
              </div>

              {filteredProducts.map((p) => {
                const isLow = p.minStock > 0 && p.stockBalance <= p.minStock;

                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 text-xs items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="col-span-4">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">SKU: {p.sku || "-"}</div>
                    </div>

                    <div className="col-span-2 text-slate-300">
                      {p.category?.name || "Umum"}
                    </div>

                    <div className="col-span-2 text-center text-slate-400">
                      {p.minStock} {p.unit}
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`text-sm font-black ${
                          isLow ? "text-amber-400" : "text-white"
                        }`}
                      >
                        {p.stockBalance} {p.unit}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => openAdjustmentModal(p)}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Sesuaikan</span>
                      </GlassButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Riwayat Mutasi */}
      {activeTab === "movements" && (
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#0B0F17]/60 backdrop-blur-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold text-slate-400 bg-white/[0.02]">
              <div className="col-span-3">Waktu & Petugas</div>
              <div className="col-span-3">Produk</div>
              <div className="col-span-2">Jenis Mutasi</div>
              <div className="col-span-2 text-right">Perubahan Qty</div>
              <div className="col-span-2">Alasan</div>
            </div>

            {movements.map((m) => {
              const isPositive = m.quantity > 0;
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-xs items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-3">
                    <div className="text-white font-medium">{formatDate(m.createdAt)}</div>
                    <div className="text-[10px] text-slate-400">
                      Oleh: {m.creator?.name || "Sistem"}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <span className="font-semibold text-white">{m.product.name}</span>
                  </div>

                  <div className="col-span-2">
                    <GlassBadge
                      size="sm"
                      variant={
                        m.movementType === "OPENING_BALANCE"
                          ? "primary"
                          : m.movementType === "SALE"
                          ? "neutral"
                          : isPositive
                          ? "success"
                          : "danger"
                      }
                    >
                      {m.movementType}
                    </GlassBadge>
                  </div>

                  <div className="col-span-2 text-right font-black">
                    <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                      {isPositive ? `+${m.quantity}` : m.quantity} {m.product.unit}
                    </span>
                  </div>

                  <div className="col-span-2 text-slate-400 truncate" title={m.reason || ""}>
                    {m.reason || "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Penyesuaian Stok Fisik (Stock Adjustment)"
        description={`Produk: ${selectedProduct?.name}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 flex justify-between">
            <span>Stok Terdaftar Saat Ini:</span>
            <span className="font-bold text-white">
              {selectedProduct?.stockBalance} {selectedProduct?.unit}
            </span>
          </div>

          <GlassInput
            type="number"
            min="0"
            label="Jumlah Stok Fisik Sebenarnya *"
            value={actualStock}
            onChange={(e) => setActualStock(Number(e.target.value))}
            required
            autoFocus
          />

          <GlassInput
            label="Alasan Penyesuaian *"
            placeholder="Contoh: Stok opname fisik, Barang rusak, Salah hitung"
            helperText="Wajib dicatat untuk keperluan audit pembukuan warung"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <GlassButton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Batal
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={loading}>
              Simpan Penyesuaian
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
