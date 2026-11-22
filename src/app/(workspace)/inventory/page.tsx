import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { InventoryClient } from "@/components/inventory/inventory-client";

export default async function InventoryPage() {
  const { tenantId } = await requireTenantContext();

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, unit: true, sku: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  let totalStockQuantity = 0;
  let totalStockValue = 0;
  let lowStockCount = 0;

  for (const p of products) {
    if (p.isActive) {
      totalStockQuantity += p.stockBalance;
      totalStockValue += p.stockBalance * p.costPrice;
      if (p.minStock > 0 && p.stockBalance <= p.minStock) {
        lowStockCount++;
      }
    }
  }

  return (
    <InventoryClient
      initialProducts={products}
      initialMovements={movements}
      totalStockValue={totalStockValue}
      totalStockQuantity={totalStockQuantity}
      lowStockCount={lowStockCount}
    />
  );
}
