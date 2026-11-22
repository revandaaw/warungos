"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  ReceiptText,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Kasir", href: "/pos", icon: ShoppingCart },
    { name: "Produk", href: "/products", icon: Package },
    { name: "Stok", href: "/inventory", icon: Boxes },
    { name: "Riwayat", href: "/transactions", icon: ReceiptText },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-150 text-[10px] font-medium gap-1",
                isActive
                  ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-emerald-400")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
