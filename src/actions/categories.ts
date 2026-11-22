"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext, requireRole } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getCategoriesAction() {
  const { tenantId } = await requireTenantContext();
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function createCategoryAction(name: string) {
  const { tenantId } = await requireRole(["OWNER"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nama kategori tidak boleh kosong.");

  const category = await prisma.category.create({
    data: {
      tenantId,
      name: trimmed,
      isActive: true,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/products");
  return { success: true, category };
}

export async function updateCategoryAction(id: string, name: string, isActive: boolean) {
  const { tenantId } = await requireRole(["OWNER"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nama kategori tidak boleh kosong.");

  // Pastikan kategori milik tenant ini (Tenant Isolation)
  const existing = await prisma.category.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Kategori tidak ditemukan.");

  await prisma.category.update({
    where: { id },
    data: { name: trimmed, isActive },
  });

  revalidatePath("/categories");
  revalidatePath("/products");
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const { tenantId } = await requireRole(["OWNER"]);
  const existing = await prisma.category.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw new Error("Kategori tidak ditemukan.");

  if (existing._count.products > 0) {
    throw new Error("Kategori ini masih digunakan oleh produk. Ubah kategori produk terlebih dahulu.");
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
  return { success: true };
}
