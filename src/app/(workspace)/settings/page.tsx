import React from "react";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const { tenantId, userId, role } = await requireTenantContext();

  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!tenant || !user) {
    return (
      <div className="p-8 text-center text-slate-400">
        Data profil warung tidak ditemukan.
      </div>
    );
  }

  return (
    <SettingsClient
      tenant={{
        id: tenant.id,
        name: tenant.name,
        businessType: tenant.businessType,
        city: tenant.city,
        timezone: tenant.timezone,
        createdAt: tenant.createdAt,
      }}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      }}
    />
  );
}
