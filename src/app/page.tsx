import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import {
  ShoppingCart,
  Boxes,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: ShoppingCart,
      title: "Kasir (POS) Kilat & Mudah",
      description: "Catat transaksi kasir tanpa repot hitung manual. Kembalian dan subtotal dihitung akurat di server.",
    },
    {
      icon: Boxes,
      title: "Manajemen Stok Otomatis",
      description: "Stok berkurang otomatis dari setiap transaksi sukses. Dilengkapi buku catatan mutasi dan peringatan stok menipis.",
    },
    {
      icon: TrendingUp,
      title: "Laporan Omzet & Laba Kotor",
      description: "Ketahui laba kotor harian dan produk terlaris secara transparan berdasarkan snapshot harga modal per barang.",
    },
    {
      icon: ShieldCheck,
      title: "Multi-Tenant & Terisolasi",
      description: "Data setiap warung terisolasi ketat. Akses berbasis peran (Owner & Kasir) menjamin keamanan keuangan usaha.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Navbar Glass */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-4 bg-[#0B0F17]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" subtitle="Sistem Manajemen Warung UMKM" />

          <div className="flex items-center gap-3">
            <Link href="/login">
              <GlassButton variant="ghost" size="sm">
                Masuk
              </GlassButton>
            </Link>
            <Link href="/register">
              <GlassButton variant="primary" size="sm">
                Daftar Gratis
              </GlassButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 mb-6">
          <GlassBadge variant="primary" size="md">
            Sistem Kasir & Stok Warung Kelontong / Sembako
          </GlassBadge>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl">
          Pembukuan Kasir & Kontrol Stok Lebih Rapi untuk{" "}
          <span className="text-emerald-400">Warung Anda</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Tinggalkan buku catatan manual. Catat transaksi kasir, pantau mutasi persediaan secara konsisten, dan lihat ringkasan laba kotor langsung dari ponsel atau laptop.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <GlassButton variant="primary" size="lg" className="w-full sm:w-auto text-base">
              <span>Buka Warung Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </GlassButton>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <GlassButton variant="secondary" size="lg" className="w-full sm:w-auto text-base">
              Masuk ke Akun Anda
            </GlassButton>
          </Link>
        </div>

        {/* Value Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tanpa Biaya Tersembunyi
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Nyaman di Layar HP
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Data Warung Terpisah & Aman
          </span>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full text-left">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <GlassCard key={i} variant="interactive" className="flex flex-col justify-between group p-6">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0B0F17]/90 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 WarungOS. Sistem manajemen operasional warung & kasir UMKM.</p>
      </footer>
    </div>
  );
}
