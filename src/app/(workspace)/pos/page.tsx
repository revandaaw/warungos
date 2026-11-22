import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { POSClient } from "@/components/pos/pos-client";

export default async function POSPage() {
  const { tenantId, tenantName } = await requireTenantContext();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <POSClient
      products={products}
      categories={categories}
      tenantName={tenantName}
    />
  );
}
