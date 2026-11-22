"use server";

import { prisma } from "@/lib/db";
import { requireTenantContext, requireRole } from "@/lib/tenant";
import { setSessionCookie, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export interface SettingsActionResult {
  success: boolean;
  message: string;
}

/**
 * Memperbarui Profil Warung (Tenant)
 * Hanya dapat dilakukan oleh OWNER (PRD Section 4 & Section 9)
 */
export async function updateTenantSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  try {
    const { tenantId, userId } = await requireRole(["OWNER"]);

    const name = formData.get("name")?.toString().trim();
    const businessType = formData.get("businessType")?.toString().trim();
    const city = formData.get("city")?.toString().trim();
    const timezone = formData.get("timezone")?.toString().trim();

    if (!name || name.length < 2) {
      return { success: false, message: "Nama warung wajib diisi minimal 2 karakter." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name,
          businessType: businessType || "Warung Kelontong",
          city: city || "Jakarta",
          timezone: timezone || "Asia/Jakarta",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          action: "UPDATE",
          entityType: "TENANT",
          entityId: tenantId,
          metadata: JSON.stringify({ name, businessType, city, timezone }),
        },
      });

      return tenant;
    });

    // Perbarui session cookie jika nama warung berubah
    const currentSession = await getSession();
    if (currentSession) {
      await setSessionCookie({
        ...currentSession,
        tenantName: updated.name,
      });
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Profil warung berhasil diperbarui.",
    };
  } catch (error: any) {
    console.error("Update tenant settings error:", error);
    return {
      success: false,
      message: error?.message || "Gagal memperbarui profil warung.",
    };
  }
}

/**
 * Memperbarui Kata Sandi Pengguna (Owner / Kasir)
 */
export async function updateUserPasswordAction(formData: FormData): Promise<SettingsActionResult> {
  try {
    const { tenantId, userId } = await requireTenantContext();

    const currentPassword = formData.get("currentPassword")?.toString();
    const newPassword = formData.get("newPassword")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, message: "Semua kolom kata sandi wajib diisi." };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Kata sandi baru minimal 6 karakter." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: "Konfirmasi kata sandi baru tidak cocok." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return { success: false, message: "Kata sandi saat ini tidak sesuai." };
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          action: "UPDATE",
          entityType: "USER",
          entityId: userId,
          metadata: JSON.stringify({ action: "PASSWORD_CHANGED" }),
        },
      });
    });

    return {
      success: true,
      message: "Kata sandi berhasil diperbarui dengan aman.",
    };
  } catch (error: any) {
    console.error("Update password error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mengubah kata sandi.",
    };
  }
}
