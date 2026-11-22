"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";
import {
  Plus,
  Search,
  Package,
  Edit2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
  toggleProductStatusAction,
  ProductFormData,
} from "@/actions/products";

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockBalance: number;
  minStock: number;
  isActive: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface ProductListClientProps {
  initialProducts: ProductItem[];
  categories: CategoryItem[];
}

export function ProductListClient({
  initialProducts,
  categories,
}: ProductListClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    categoryId: "",
    sku: "",
    unit: "pcs",
    costPrice: 0,
    sellPrice: 0,
    openingStock: 0,
    minStock: 0,
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      categoryId: categories[0]?.id || "",
      sku: "",
      unit: "pcs",
      costPrice: 0,
      sellPrice: 0,
      openingStock: 0,
      minStock: 5,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId || "",
      sku: product.sku || "",
      unit: product.unit,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      openingStock: product.stockBalance,
      minStock: product.minStock,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingProduct) {
        const res = await updateProductAction(editingProduct.id, {
          name: formData.name,
          categoryId: formData.categoryId || null,
          sku: formData.sku || null,
          unit: formData.unit,
          costPrice: Number(formData.costPrice),
          sellPrice: Number(formData.sellPrice),
          minStock: Number(formData.minStock),
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  ...res.product,
                  category: categories.find((c) => c.id === formData.categoryId) || null,
                }
              : p
          )
        );
      } else {
        const res = await createProductAction({
          ...formData,
          costPrice: Number(formData.costPrice),
          sellPrice: Number(formData.sellPrice),
          openingStock: Number(formData.openingStock),
          minStock: Number(formData.minStock),
        });

        const newP = {
          ...res.product,
          category: categories.find((c) => c.id === formData.categoryId) || null,
        };
        setProducts((prev) => [newP as any, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan produk.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleProductStatusAction(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: res.isActive } : p))
      );
    } catch (err: any) {
      alert(err?.message || "Gagal mengubah status produk.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Katalog Produk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola daftar barang dagangan, harga modal/jual, dan batas minimum stok.
          </p>
        </div>
        <GlassButton variant="primary" size="md" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </GlassButton>
      </div>

      {/* Filter and Search Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <GlassInput
              placeholder="Cari nama barang atau kode SKU..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "ALL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              Semua ({products.length})
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

      {/* Product List Table */}
      {filteredProducts.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Tidak ada produk ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== "ALL"
              ? "Coba ubah kata kunci pencarian atau filter kategori Anda."
              : "Mulai tambahkan produk pertama warung Anda untuk melayani kasir."}
          </p>
          <div className="mt-4">
            <GlassButton variant="primary" size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Pertama</span>
            </GlassButton>
          </div>
        </GlassCard>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#0B0F17]/60 backdrop-blur-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold text-slate-400 bg-white/[0.02]">
              <div className="col-span-4">Nama Produk / SKU</div>
              <div className="col-span-2">Kategori</div>
              <div className="col-span-2 text-right">Harga Modal / Jual</div>
              <div className="col-span-2 text-center">Sisa Stok</div>
              <div className="col-span-2 text-right">Aksi</div>
            </div>

            {/* Table Rows */}
            {filteredProducts.map((p) => {
              const profitMargin = p.sellPrice - p.costPrice;
              const isLowStock = p.minStock > 0 && p.stockBalance <= p.minStock;

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 gap-3 px-4 py-3.5 text-xs items-center hover:bg-white/[0.02] transition-colors ${
                    !p.isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="col-span-4">
                    <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {!p.isActive && (
                        <GlassBadge size="sm" variant="danger">
                          Nonaktif
                        </GlassBadge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>SKU: {p.sku || "-"}</span>
                      <span>•</span>
                      <span>Satuan: {p.unit}</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-300">
                      {p.category?.name || "Tanpa Kategori"}
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-bold text-white">{formatRupiah(p.sellPrice)}</div>
                    <div className="text-[10px] text-slate-400">
                      Modal: {formatRupiah(p.costPrice)} (Margin: +{formatRupiah(profitMargin)})
                    </div>
                  </div>

                  <div className="col-span-2 text-center">
                    <span
                      className={`font-black text-sm ${
                        isLowStock ? "text-amber-400" : "text-white"
                      }`}
                    >
                      {p.stockBalance} {p.unit}
                    </span>
                    {isLowStock && (
                      <span className="block text-[10px] text-amber-400 font-medium">
                        (Min: {p.minStock})
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit Produk"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(p.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        p.isActive
                          ? "text-emerald-400 hover:bg-emerald-500/10"
                          : "text-slate-400 hover:bg-white/10"
                      }`}
                      title={p.isActive ? "Nonaktifkan Produk" : "Aktifkan Produk"}
                    >
                      {p.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Ubah Informasi Produk" : "Tambah Produk Baru"}
        description="Masukkan detail produk, harga modal, harga jual, dan stok awal."
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <GlassInput
            label="Nama Produk *"
            placeholder="Contoh: Air Mineral 600 ml"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Kategori</label>
              <select
                value={formData.categoryId || ""}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="glass-input text-sm"
              >
                <option value="" className="bg-[#0B0F17] text-slate-300">
                  Tanpa Kategori
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0B0F17] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <GlassInput
              label="Kode SKU / Barcode (Opsional)"
              placeholder="Contoh: AM600"
              value={formData.sku || ""}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              label="Satuan Jual *"
              placeholder="pcs, botol, kg, liter"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />

            <GlassInput
              type="number"
              min="0"
              label="Harga Modal (Rp) *"
              placeholder="0"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
              required
            />

            <GlassInput
              type="number"
              min="0"
              label="Harga Jual (Rp) *"
              placeholder="0"
              value={formData.sellPrice}
              onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingProduct ? (
              <GlassInput
                type="number"
                min="0"
                label="Stok Awal *"
                helperText="Dicatat sebagai mutasi awal OPENING_BALANCE"
                placeholder="0"
                value={formData.openingStock}
                onChange={(e) => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                required
              />
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-400">
                <span className="block font-semibold text-white">Stok Saat Ini:</span>
                {editingProduct.stockBalance} {editingProduct.unit}
                <p className="text-[10px] text-slate-500 mt-1">
                  Ubah jumlah stok melalui menu Persediaan & Stok (Stock Adjustment).
                </p>
              </div>
            )}

            <GlassInput
              type="number"
              min="0"
              label="Batas Peringatan Stok Minimum"
              placeholder="Contoh: 5"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={loading}>
              {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
