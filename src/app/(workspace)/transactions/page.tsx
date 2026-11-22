import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export default async function TransactionsPage() {
  const { tenantId, role } = await requireTenantContext();

  const sales = await prisma.sale.findMany({
    where: { tenantId },
    include: {
      cashier: { select: { name: true } },
      items: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <TransactionsClient
      initialSales={sales}
      userRole={role}
    />
  );
}
