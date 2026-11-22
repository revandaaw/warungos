import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { getFinancialReportAction } from "@/actions/reports";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const { tenantName } = await requireTenantContext();

  // Load default report (30 hari terakhir)
  const initialReport = await getFinancialReportAction();

  return (
    <ReportsClient
      initialReport={initialReport}
      tenantName={tenantName}
    />
  );
}
