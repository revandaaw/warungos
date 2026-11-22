"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  RotateCcw,
  AlertCircle,
  Coins,
  Store,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { checkoutAction, ReceiptData } from "@/actions/pos";

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  sellPrice: number;
  costPrice: number;
  stockBalance: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface CartItem {
  product: ProductItem;
  qty: number;
}

interface POSClientProps {
  products: ProductItem[];
  categories: CategoryItem[];
  tenantName: string;
}

export function POSClient({ products, categories, tenantName }: POSClientProps) {
  const [productList, setProductList] = useState<ProductItem[]>(products);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashInputString, setCashInputString] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Struk Modal State
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Filtered Products
  const filteredProducts = productList.filter((p) => {
    const matchesCategory =
      selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Cart Calculations
  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const grandTotal = cart.reduce(
    (sum, item) => sum + item.product.sellPrice * item.qty,
    0
  );
  const change = Math.max(0, cashReceived - grandTotal);
  const isCashSufficient = cashReceived >= grandTotal && grandTotal > 0;

  // Cart Actions
  const addToCart = (product: ProductItem) => {
    setError(null);
    if (product.stockBalance <= 0) {
      setError(`Stok untuk "${product.name}" sudah habis.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stockBalance) {
          setError(`Maksimal stok tersedia untuk "${product.name}" adalah ${product.stockBalance} ${product.unit}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { product, qty: 1 }];
      }
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((i) => i.product.id === productId);
    if (item && newQty > item.product.stockBalance) {
      setError(`Maksimal stok tersedia untuk "${item.product.name}" adalah ${item.product.stockBalance} ${item.product.unit}.`);
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, qty: newQty } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived(0);
    setCashInputString("");
    setError(null);
  };

  // Quick Cash Handlers
  const handleSetCash = (amount: number) => {
    setCashReceived(amount);
    setCashInputString(amount > 0 ? String(amount) : "");
  };

  const handleAddCash = (increment: number) => {
    const nextAmount = (cashReceived || 0) + increment;
    handleSetCash(nextAmount);
  };

  // Submit Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!isCashSufficient) {
      setError("Jumlah uang diterima masih kurang dari total belanja.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        items: cart.map((i) => ({ productId: i.product.id, qty: i.qty })),
        cashReceived,
      };

      const result = await checkoutAction(payload);

      if (result.success && result.receipt) {
        // Kurangi stok di UI state lokal secara instan
        setProductList((prev) =>
          prev.map((p) => {
            const bought = cart.find((c) => c.product.id === p.id);
            if (bought) {
              return { ...p, stockBalance: p.stockBalance - bought.qty };
            }
            return p;
          })
        );

        setReceipt(result.receipt);
        setIsReceiptOpen(true);
        clearCart();
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memproses transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Kasir Penjualan</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
              POS Aktif
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Pilih produk untuk melayani transaksi pembeli di {tenantName}.
          </p>
        </div>
      </div>

      {/* Main Grid: Katalog (Kiri) & Keranjang Belanja (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kolom Kiri: Katalog & Pencarian */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Search & Kategori Filter */}
          <GlassCard className="p-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1">
                <GlassInput
                  placeholder="Cari nama barang atau scan kode SKU..."
                  icon={<Search className="w-4 h-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === "ALL"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  Semua ({productList.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Grid Produk */}
          {filteredProducts.length === 0 ? (
            <GlassCard className="p-10 text-center text-xs text-slate-400">
              Tidak ada produk yang cocok dengan pencarian.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.stockBalance <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`glass-card p-3.5 flex flex-col justify-between text-left transition-all duration-150 select-none relative group border border-white/[0.08] ${
                      isOutOfStock
                        ? "opacity-40 cursor-not-allowed bg-slate-950/40"
                        : "hover:border-emerald-500/30 hover:bg-white/[0.05] cursor-pointer active:scale-95"
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-md">
                        {inCart.qty}
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block truncate">
                        {p.category?.name || "Umum"}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-emerald-400">
                          {formatRupiah(p.sellPrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Stok: {p.stockBalance} {p.unit}
                        </div>
                      </div>
                      <div className="p-1 rounded-lg bg-white/[0.05] text-slate-300 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Keranjang Kasir & Pembayaran */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-16 space-y-3">
          <GlassCard className="p-5 flex flex-col justify-between">
            {/* Header Keranjang */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Keranjang Pembeli</h3>
              </div>
              <div className="flex items-center gap-2">
                <GlassBadge size="sm">{totalItemCount} Item</GlassBadge>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                    title="Kosongkan Keranjang"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* List Item Keranjang */}
            <div className="mt-3 divide-y divide-white/[0.06] max-h-[220px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-30" />
                  <p>Keranjang masih kosong.</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Klik produk di sebelah kiri untuk menambahkan.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 overflow-hidden">
                      <h5 className="font-semibold text-white truncate">{item.product.name}</h5>
                      <span className="text-[10px] text-slate-400">
                        {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                      </span>
                    </div>

                    {/* Quantity Modifier */}
                    <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
                      <button
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-white text-xs">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right w-16">
                      <span className="font-bold text-white text-xs">
                        {formatRupiah(item.product.sellPrice * item.qty)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Total Belanja */}
            <div className="pt-3 border-t border-white/[0.08] mt-3 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Subtotal ({totalItemCount} item)</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total Bayar</span>
                <span className="text-lg font-black text-emerald-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Bagian Pembayaran Tunai (POS-03) */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-white/[0.08] mt-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Uang Tunai Diterima</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSetCash(grandTotal)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Uang Pas
                    </button>
                  </div>

                  <GlassInput
                    type="number"
                    min="0"
                    placeholder="Masukkan nominal uang (Rp)..."
                    value={cashInputString}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCashInputString(val);
                      setCashReceived(Number(val) || 0);
                    }}
                  />

                  {/* Tombol Pecahan Cepat */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => handleSetCash(nominal)}
                        className="py-1 px-1.5 text-[10px] font-bold rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5 transition-colors"
                      >
                        +{nominal / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uang Kembalian */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Uang Kembalian:</span>
                  <span
                    className={`font-black text-sm ${
                      isCashSufficient ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {isCashSufficient ? formatRupiah(change) : "Rp 0"}
                  </span>
                </div>

                {/* Tombol Selesaikan Transaksi */}
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  disabled={!isCashSufficient || loading}
                  isLoading={loading}
                  onClick={handleCheckout}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesaikan & Simpan Transaksi</span>
                </GlassButton>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* MODAL STRUK DIGITAL (RECEIPT) */}
      <GlassModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Transaksi Berhasil!"
        description="Nota penjualan tersimpan dan stok barang otomatis terpotong."
        maxWidth="md"
      >
        {receipt && (
          <div className="space-y-4">
            {/* Tampilan Kertas Struk */}
            <div className="p-4 rounded-xl bg-[#080B10] border border-white/10 font-mono text-xs text-slate-300 space-y-3">
              <div className="text-center border-b border-dashed border-white/20 pb-3">
                <h4 className="font-bold text-sm text-white tracking-wider">{receipt.tenantName}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Sistem Kasir WarungOS</p>
                <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                  <span>Nota: {receipt.receiptNo}</span>
                  <span>{formatDate(receipt.createdAt)}</span>
                </div>
                <div className="text-[10px] text-slate-400 text-left">
                  Kasir: {receipt.cashierName}
                </div>
              </div>

              {/* Daftar Barang */}
              <div className="divide-y divide-dashed divide-white/10 py-1 space-y-1">
                {receipt.items.map((it, idx) => (
                  <div key={idx} className="pt-1.5 flex justify-between">
                    <div>
                      <div className="font-semibold text-white">{it.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {it.qty} x {formatRupiah(it.sellPrice)}
                      </div>
                    </div>
                    <div className="text-right font-bold text-white">
                      {formatRupiah(it.lineTotal)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Kembalian */}
              <div className="border-t border-dashed border-white/20 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-white text-sm">
                  <span>TOTAL</span>
                  <span className="text-emerald-400">{formatRupiah(receipt.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>TUNAI</span>
                  <span>{formatRupiah(receipt.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                  <span>KEMBALIAN</span>
                  <span>{formatRupiah(receipt.change)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-dashed border-white/20">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Aksi Struk */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <GlassButton variant="secondary" size="md" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                <span>Cetak Nota</span>
              </GlassButton>

              <GlassButton
                variant="primary"
                size="md"
                onClick={() => setIsReceiptOpen(false)}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Transaksi Baru</span>
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
