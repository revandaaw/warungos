"use client";

import React from "react";
import { User, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { BrandIcon } from "@/components/ui/brand-logo";

interface HeaderProps {
  tenantName: string;
  userName: string;
  userRole: string;
}

export function Header({ tenantName, userName, userRole }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 py-3.5 bg-slate-950/60 backdrop-blur-xl border-b border-white/10">
      {/* Mobile Brand / Tenant Name */}
      <div className="flex items-center gap-2.5">
        <div className="lg:hidden">
          <BrandIcon size="sm" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{tenantName}</span>
            <span className="hidden sm:inline-block text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
              Online
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Sistem Manajemen Warung Aktif
          </p>
        </div>
      </div>

      {/* User Info Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-right">
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-white">{userName}</p>
            <p className="text-[10px] text-emerald-400 font-medium">{userRole}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
        </div>

        <button
          onClick={() => logoutAction()}
          className="lg:hidden p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
          title="Keluar"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
