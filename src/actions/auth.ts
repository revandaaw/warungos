"use server";

import { prisma } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export interface AuthActionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * AUTH-01 & TEN-01: Registrasi Akun dan Pembuatan Warung Baru (Atomik)
 * Sistem membuat tenant dan menghubungkan pengguna sebagai Owner dalam satu transaksi database.
 */
export async function registerAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const warungName = formData.get("warungName")?.toString().trim();
    const businessType = formData.get("businessType")?.toString().trim() || "Warung Kelontong";
    const city = formData.get("city")?.toString().trim() || "Jakarta";

    // Validasi Input
    if (!name || !email || !password || !warungName) {
      return { success: false, message: "Semua kolom bertanda bintang wajib diisi." };
    }

    if (password.length < 6) {
      return { success: false, message: "Password minimal 6 karakter." };
    }

    // Periksa apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: "Email ini sudah terdaftar. Silakan masuk." };
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Eksekusi atomik pembuatan User, Tenant, TenantUser (Owner), dan Kategori default
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat User
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });

      // 2. Buat Tenant (Warung)
      const tenant = await tx.tenant.create({
        data: {
          name: warungName,
          businessType,
          city,
          timezone: "Asia/Jakarta",
          status: "ACTIVE",
        },
      });

      // 3. Hubungkan User sebagai OWNER pada Tenant
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      // 4. Buat Kategori Starter Default
      const starterCategories = ["Minuman", "Makanan", "Sembako", "Kebutuhan Harian"];
      for (const catName of starterCategories) {
        await tx.category.create({
          data: {
            tenantId: tenant.id,
            name: catName,
            isActive: true,
          },
        });
      }

      // 5. Catat Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: user.id,
          action: "CREATE",
          entityType: "TENANT",
          entityId: tenant.id,
          metadata: JSON.stringify({ warungName, businessType, city }),
        },
      });

      return { user, tenant };
    });

    // Set cookie sesi
    await setSessionCookie({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      tenantId: result.tenant.id,
      tenantName: result.tenant.name,
      role: "OWNER",
    });

    return {
      success: true,
      message: `Selamat datang di WarungOS! Warung "${warungName}" berhasil didaftarkan.`,
    };
  } catch (error: any) {
    console.error("Register error:", error);
    return {
      success: false,
      message: error?.message || "Terjadi kesalahan saat memproses pendaftaran.",
    };
  }
}

/**
 * AUTH-02: Login Pengguna
 */
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return { success: false, message: "Email dan password wajib diisi." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenantUsers: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, message: "Email atau password tidak sesuai." };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, message: "Email atau password tidak sesuai." };
    }

    // Ambil tenant aktif pertama
    const activeMembership = user.tenantUsers.find(
      (tu) => tu.status === "ACTIVE" && tu.tenant.status === "ACTIVE"
    );

    if (!activeMembership) {
      return { success: false, message: "Akun Anda belum terhubung ke warung aktif." };
    }

    // Simpan session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: activeMembership.tenant.id,
      tenantName: activeMembership.tenant.name,
      role: activeMembership.role,
    });

    return { success: true, message: "Berhasil masuk." };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, message: "Gagal masuk. Silakan coba lagi." };
  }
}

/**
 * AUTH-02: Logout Pengguna
 */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
}
