"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Boxes,
  ReceiptText,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { BrandLogo } from "@/components/ui/brand-logo";

interface SidebarProps {
  tenantName: string;
  userName: string;
  userRole: string;
}

export function Sidebar({ tenantName, userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Kasir (POS)", href: "/pos", icon: ShoppingCart },
    { name: "Produk", href: "/products", icon: Package },
    { name: "Kategori", href: "/categories", icon: Layers },
    { name: "Persediaan & Stok", href: "/inventory", icon: Boxes },
    { name: "Transaksi", href: "/transactions", icon: ReceiptText },
    { name: "Laporan", href: "/reports", icon: BarChart3 },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 glass-panel border-r border-white/[0.08] bg-[#0B0F17]/90 backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.08]">
        <BrandLogo size="md" subtitle={tenantName} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative",
                isActive
                  ? "bg-white/[0.08] text-white border border-white/10 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-105",
                  isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span>{item.name}</span>
              {isActive && (
                <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-white/[0.08] bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{userName}</p>
              <span className="inline-block text-[10px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10 font-medium">
                {userRole}
              </span>
            </div>
          </div>
          <button
            onClick={() => logoutAction()}
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
