import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./db";

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  userId: string;
  role: string;
}

/**
 * Mendapatkan dan memvalidasi Tenant Context secara Server-side (PRD TEN-03, SEC-03)
 * Mencegah manipulasi tenant_id dari browser!
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Verifikasi keabsahan relasi user-tenant di database secara langsung
  const membership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId: session.tenantId,
        userId: session.userId,
      },
    },
    include: {
      tenant: true,
    },
  });

  if (!membership || membership.status !== "ACTIVE" || membership.tenant.status !== "ACTIVE") {
    redirect("/login");
  }

  return {
    tenantId: membership.tenantId,
    tenantName: membership.tenant.name,
    userId: session.userId,
    role: membership.role,
  };
}

/**
 * Validasi otorisasi role
 * Memastikan hanya role yang berwenang (misal OWNER) yang bisa melakukan aksi tertentu
 */
export async function requireRole(allowedRoles: string[]): Promise<TenantContext> {
  const context = await requireTenantContext();
  if (!allowedRoles.includes(context.role)) {
    throw new Error(`FORBIDDEN: Aksi ini memerlukan peran [${allowedRoles.join(", ")}]. Peran Anda: ${context.role}`);
  }
  return context;
}
