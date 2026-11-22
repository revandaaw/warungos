import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { ProductListClient } from "@/components/products/product-list-client";

export default async function ProductsPage() {
  const { tenantId } = await requireTenantContext();

  // Ambil data produk & kategori tenant aktif
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProductListClient
      initialProducts={products}
      categories={categories}
    />
  );
}
