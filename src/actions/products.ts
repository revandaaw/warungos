"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext, requireRole } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface ProductFormData {
  name: string;
  categoryId?: string | null;
  sku?: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  openingStock: number;
  minStock: number;
}

/**
 * PROD-01, PROD-02, INV-01: Tambah Produk Baru dengan Mutasi Stok Awal
 */
export async function createProductAction(data: ProductFormData) {
  const { tenantId, userId } = await requireRole(["OWNER"]);

  if (!data.name?.trim()) throw new Error("Nama produk wajib diisi.");
  if (data.costPrice < 0 || data.sellPrice < 0) {
    throw new Error("Harga modal dan harga jual tidak boleh negatif.");
  }
  if (data.openingStock < 0) {
    throw new Error("Stok awal tidak boleh negatif.");
  }

  // Cek SKU unik di dalam tenant (PROD-03)
  if (data.sku?.trim()) {
    const existingSku = await prisma.product.findFirst({
      where: { tenantId, sku: data.sku.trim() },
    });
    if (existingSku) {
      throw new Error(`SKU "${data.sku.trim()}" sudah digunakan pada produk lain di warung Anda.`);
    }
  }

  // Simpan produk dan mutasi stok awal secara atomik (INV-01)
  const product = await prisma.$transaction(async (tx) => {
    const newProduct = await tx.product.create({
      data: {
        tenantId,
        categoryId: data.categoryId || null,
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        unit: data.unit || "pcs",
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        stockBalance: data.openingStock,
        minStock: data.minStock || 0,
        isActive: true,
      },
    });

    // Catat mutasi stok awal jika openingStock > 0
    if (data.openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: newProduct.id,
          movementType: "OPENING_BALANCE",
          quantity: data.openingStock,
          referenceType: "MANUAL",
          reason: "Saldo stok awal saat produk didaftarkan",
          createdBy: userId,
        },
      });
    }

    return newProduct;
  });

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, product };
}

/**
 * Update data produk
 */
export async function updateProductAction(
  id: string,
  data: Omit<ProductFormData, "openingStock">
) {
  const { tenantId } = await requireRole(["OWNER"]);

  const existing = await prisma.product.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Produk tidak ditemukan.");

  if (!data.name?.trim()) throw new Error("Nama produk wajib diisi.");
  if (data.costPrice < 0 || data.sellPrice < 0) {
    throw new Error("Harga tidak boleh negatif.");
  }

  // Cek keunikan SKU jika diubah
  if (data.sku?.trim() && data.sku.trim() !== existing.sku) {
    const existingSku = await prisma.product.findFirst({
      where: { tenantId, sku: data.sku.trim(), NOT: { id } },
    });
    if (existingSku) {
      throw new Error(`SKU "${data.sku.trim()}" sudah digunakan.`);
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      categoryId: data.categoryId || null,
      sku: data.sku?.trim() || null,
      unit: data.unit,
      costPrice: data.costPrice,
      sellPrice: data.sellPrice,
      minStock: data.minStock,
    },
  });

  revalidatePath("/products");
  revalidatePath("/inventory");
  return { success: true, product: updated };
}

/**
 * Toggle Status Aktif/Nonaktif Produk
 */
export async function toggleProductStatusAction(id: string) {
  const { tenantId } = await requireRole(["OWNER"]);
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
  });
  if (!product) throw new Error("Produk tidak ditemukan.");

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  revalidatePath("/products");
  return { success: true, isActive: updated.isActive };
}

/**
 * Ambil daftar produk tenant aktif dengan filter
 */
export async function getProductsAction(options?: {
  categoryId?: string;
  search?: string;
  activeOnly?: boolean;
}) {
  const { tenantId } = await requireTenantContext();

  return prisma.product.findMany({
    where: {
      tenantId,
      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { sku: { contains: options.search } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });
}
