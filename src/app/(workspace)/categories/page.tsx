import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { CategoryListClient } from "@/components/categories/category-list-client";

export default async function CategoriesPage() {
  const { tenantId } = await requireTenantContext();

  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return <CategoryListClient initialCategories={categories} />;
}
