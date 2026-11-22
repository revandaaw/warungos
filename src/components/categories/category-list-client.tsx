"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";
import {
  Plus,
  Layers,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/actions/categories";

interface CategoryWithCount {
  id: string;
  name: string;
  isActive: boolean;
  _count: { products: number };
}

export function CategoryListClient({
  initialCategories,
}: {
  initialCategories: CategoryWithCount[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryWithCount) => {
    setEditingCategory(cat);
    setName(cat.name);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingCategory) {
        await updateCategoryAction(editingCategory.id, name, editingCategory.isActive);
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, name } : c))
        );
      } else {
        const res = await createCategoryAction(name);
        setCategories((prev) => [
          ...prev,
          { ...res.category, _count: { products: 0 } },
        ]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan kategori.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat: CategoryWithCount) => {
    if (cat._count.products > 0) {
      alert(`Kategori "${cat.name}" masih digunakan oleh ${cat._count.products} produk. Ubah kategori produk terlebih dahulu.`);
      return;
    }

    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;

    try {
      await deleteCategoryAction(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus kategori.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Kategori Produk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelompokkan barang dagangan agar kasir lebih cepat mencari produk.
          </p>
        </div>
        <GlassButton variant="primary" size="md" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori</span>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <GlassCard key={cat.id} className="p-5 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                <span className="text-[11px] text-slate-400">
                  {cat._count.products} produk terdaftar
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditModal(cat)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Edit Kategori"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Hapus Kategori"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Ubah Nama Kategori" : "Tambah Kategori Baru"}
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <GlassInput
            label="Nama Kategori *"
            placeholder="Contoh: Minuman Dingin, Snack & Biskuit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <GlassButton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Batal
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={loading}>
              Simpan
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
