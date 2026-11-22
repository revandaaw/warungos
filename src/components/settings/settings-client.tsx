"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { 
  Store, 
  Palette, 
  Lock, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  DownloadCloud,
  Layers
} from "lucide-react";
import { themeConfig } from "@/lib/theme";
import { updateTenantSettingsAction, updateUserPasswordAction } from "@/actions/settings";
import { exportTransactionsCsvAction } from "@/actions/reports";

interface SettingsClientProps {
  tenant: {
    id: string;
    name: string;
    businessType: string;
    city: string;
    timezone: string;
    createdAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function SettingsClient({ tenant, user }: SettingsClientProps) {
  // Tenant Profile Form State
  const [tenantName, setTenantName] = useState(tenant.name);
  const [businessType, setBusinessType] = useState(tenant.businessType);
  const [city, setCity] = useState(tenant.city);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantMessage, setTenantMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Backup state
  const [exportLoading, setExportLoading] = useState(false);

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantLoading(true);
    setTenantMessage(null);

    const formData = new FormData();
    formData.append("name", tenantName);
    formData.append("businessType", businessType);
    formData.append("city", city);
    formData.append("timezone", timezone);

    const res = await updateTenantSettingsAction(formData);
    setTenantLoading(false);

    if (res.success) {
      setTenantMessage({ type: "success", text: res.message });
      setTimeout(() => setTenantMessage(null), 4000);
    } else {
      setTenantMessage({ type: "error", text: res.message });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    const res = await updateUserPasswordAction(formData);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordMessage({ type: "success", text: res.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(null), 4000);
    } else {
      setPasswordMessage({ type: "error", text: res.message });
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const csvContent = await exportTransactionsCsvAction({});
      if (csvContent) {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `warungos-backup-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Gagal mengunduh backup data transaksi.");
      }
    } catch {
      alert("Terjadi kesalahan saat mengekspor data.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Pengaturan Warung</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Kelola profil warung, keamanan akun, cadangan data, dan konfigurasi tema visual.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Profil Warung */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Profil Warung (Tenant)</h3>
            </div>
            <GlassBadge variant="success">ID: {tenant.id.slice(0, 8)}...</GlassBadge>
          </div>

          {tenantMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
                tenantMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              {tenantMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{tenantMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateTenant} className="space-y-4">
            <GlassInput
              label="Nama Warung"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Contoh: Warung Berkah Jaya"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label="Jenis Usaha"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="Warung Kelontong"
                required
              />
              <GlassInput
                label="Kota / Lokasi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jakarta"
                required
              />
            </div>
            <GlassInput
              label="Zona Waktu"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Jakarta"
              required
            />

            <div className="pt-2 flex justify-end">
              <GlassButton type="submit" variant="primary" size="sm" isLoading={tenantLoading}>
                Simpan Perubahan
              </GlassButton>
            </div>
          </form>
        </GlassCard>

        {/* Keamanan & Akun */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Keamanan Akun</h3>
            </div>
            <GlassBadge variant="neutral">{user.role}</GlassBadge>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Nama Pengguna:</span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email Terdaftar:</span>
              <span className="font-semibold text-white">{user.email}</span>
            </div>
          </div>

          {passwordMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
                passwordMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              {passwordMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <GlassInput
              label="Kata Sandi Saat Ini"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label="Kata Sandi Baru"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 karakter"
                required
              />
              <GlassInput
                label="Konfirmasi Baru"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <GlassButton type="submit" variant="secondary" size="sm" isLoading={passwordLoading}>
                Ubah Kata Sandi
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desain Glassmorphism & Font Terpusat */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Palette className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Desain Glassmorphism & Font</h3>
              <p className="text-[11px] text-slate-400">
                Konfigurasi tema terpusat (Clean Obsidian & Crisp Emerald).
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p>
              Seluruh warna, blur filter, dan tipografi diatur dalam satu modul terpusat:
            </p>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-emerald-300 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>src/lib/theme.ts & src/app/globals.css</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="font-semibold text-white block mb-1">Font Aktif</span>
                <span className="text-slate-400 font-mono text-[11px]">{themeConfig.fonts.sans}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="font-semibold text-white block mb-1">Palet Utama</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full bg-[#10b981]" title="Crisp Emerald" />
                  <div className="w-4 h-4 rounded-full bg-[#64748b]" title="Cool Slate" />
                  <div className="w-4 h-4 rounded-full bg-[#0b0f17] border border-white/20" title="Matte Obsidian" />
                  <span className="text-[10px] text-slate-400">Obsidian • Emerald</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Cadangan Data & Kesiapan Produksi */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Cadangan Data & Audit SOP</h3>
              <p className="text-[11px] text-slate-400">
                Sesuai PRD Section 12.2 Production Gates.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Multi-Tenant Isolation Aktif</span>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  Semua transaksi, pergerakan stok, dan laporan terisolasi penuh pada ID warung Anda.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Ekspor Cadangan Transaksi</span>
                <span className="text-[11px] text-slate-400">Format CSV terkompresi untuk arsip</span>
              </div>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handleExportData}
                isLoading={exportLoading}
              >
                <DownloadCloud className="w-4 h-4 mr-1.5" />
                Unduh CSV
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
