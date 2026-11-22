"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { BrandIcon } from "@/components/ui/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      window.location.href = "/dashboard";
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  const fillDemo = () => {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    if (emailInput && passwordInput) {
      emailInput.value = "owner@warungberkah.com";
      passwordInput.value = "password123";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
          </Link>
          <div className="flex justify-center mb-3">
            <BrandIcon size="xl" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Masuk ke Warung</h2>
            <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
              OS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Kelola transaksi kasir dan persediaan warung Anda
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
            <GlassInput
              id="email"
              name="email"
              type="email"
              label="Alamat Email"
              placeholder="nama@warung.com"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <GlassInput
              id="password"
              name="password"
              type="password"
              label="Kata Sandi (Password)"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Masuk ke Warung
            </GlassButton>
          </form>

          {/* Demo Login Quick Fill */}
          <div className="mt-6 pt-5 border-t border-white/[0.08]">
            <p className="text-[11px] text-slate-400 text-center mb-2">
              Ingin coba langsung tanpa daftar?
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all text-center"
            >
              Gunakan Akun Demo (Warung Berkah)
            </button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400">
              Belum punya warung terdaftar?{" "}
              <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
