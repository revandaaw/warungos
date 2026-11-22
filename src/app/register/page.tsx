"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { User, Mail, Lock, MapPin, Tag, AlertCircle, ArrowLeft, Building2 } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { BrandIcon } from "@/components/ui/brand-logo";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    if (result.success) {
      window.location.href = "/dashboard";
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative py-12">
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
          </Link>
          <div className="flex justify-center mb-3">
            <BrandIcon size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Daftarkan Warung</h2>
            <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
              OS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Mulai kelola kasir dan stok dalam satu sistem praktis
          </p>
        </div>

        <GlassCard className="p-7">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/[0.08] pb-1.5 mb-2">
              Informasi Pemilik (Owner)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                id="name"
                name="name"
                type="text"
                label="Nama Lengkap *"
                placeholder="Contoh: Budi Santoso"
                icon={<User className="w-4 h-4" />}
                required
              />

              <GlassInput
                id="email"
                name="email"
                type="email"
                label="Email Login *"
                placeholder="budi@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <GlassInput
              id="password"
              name="password"
              type="password"
              label="Kata Sandi (Minimal 6 karakter) *"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/[0.08] pb-1.5 mt-6 mb-2">
              Informasi Warung (Tenant)
            </div>

            <GlassInput
              id="warungName"
              name="warungName"
              type="text"
              label="Nama Warung / Toko *"
              placeholder="Contoh: Warung Kelontong Berkah"
              icon={<Building2 className="w-4 h-4" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                id="businessType"
                name="businessType"
                type="text"
                label="Jenis Usaha"
                defaultValue="Warung Kelontong & Sembako"
                icon={<Tag className="w-4 h-4" />}
              />

              <GlassInput
                id="city"
                name="city"
                type="text"
                label="Kota / Kabupaten"
                placeholder="Contoh: Jakarta Selatan"
                icon={<MapPin className="w-4 h-4" />}
              />
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={loading}
            >
              Daftar & Masuk ke Warung
            </GlassButton>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
