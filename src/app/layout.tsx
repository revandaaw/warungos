import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "WarungOS — Sistem Manajemen Warung & Kasir UMKM",
  description: "Aplikasi POS kasir, manajemen produk, stok inventaris, dan laporan laba kotor untuk warung kelontong & sembako.",
  keywords: ["warung", "POS", "kasir", "UMKM", "stok", "inventaris", "SaaS"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-emerald-500/25 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
