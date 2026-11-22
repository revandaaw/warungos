import React from "react";
import { cn } from "@/lib/utils";

interface BrandIconProps extends React.SVGProps<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-5 h-5",
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-11 h-11",
  xl: "w-14 h-14",
};

/**
 * Bespoke WarungOS Emblem Mark
 * Menggabungkan siluet arsitektur tenda/kanopi warung tradisional
 * dengan presisi monogram geometris huruf "W" & node kasir modern.
 */
export function BrandIcon({ size = "md", className, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", sizeClasses[size], className)}
      {...props}
    >
      <defs>
        {/* Gradien emerald utama */}
        <linearGradient id="wos-emerald-grad" x1="6" y1="6" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="0.45" stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>

        {/* Gradien aksen tenda kanopi */}
        <linearGradient id="wos-canopy-grad" x1="10" y1="8" x2="34" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6EE7B7" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>

        {/* Gradien bezel bingkai obsidian */}
        <linearGradient id="wos-border-grad" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(52, 211, 153, 0.5)" />
          <stop offset="0.6" stopColor="rgba(16, 185, 129, 0.2)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 0.05)" />
        </linearGradient>

        {/* Bayangan halus */}
        <filter id="wos-glow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Kontainer squircle obsidian dengan efek kaca */}
      <rect
        x="2"
        y="2"
        width="40"
        height="40"
        rx="12"
        fill="#0B131E"
        stroke="url(#wos-border-grad)"
        strokeWidth="1.5"
      />

      {/* Efek frosted highlight kaca pada sudut kiri atas */}
      <path
        d="M 3.5 14 C 3.5 8 8 3.5 14 3.5 H 22 C 10 3.5 3.5 10 3.5 22 Z"
        fill="white"
        fillOpacity="0.06"
      />

      {/* Kanopi / Awning Warung Minimalis Modern */}
      <path
        d="M 10 12 C 10 10.6 11.1 9.5 12.5 9.5 H 31.5 C 32.9 9.5 34 10.6 34 12 L 35.5 15 H 8.5 L 10 12 Z"
        fill="url(#wos-canopy-grad)"
      />

      {/* Detail garis segmen kanopi ritel */}
      <line x1="17" y1="9.5" x2="16.5" y2="15" stroke="#047857" strokeWidth="1.2" strokeOpacity="0.6" />
      <line x1="22" y1="9.5" x2="22" y2="15" stroke="#047857" strokeWidth="1.2" strokeOpacity="0.6" />
      <line x1="27" y1="9.5" x2="27.5" y2="15" stroke="#047857" strokeWidth="1.2" strokeOpacity="0.6" />

      {/* Monogram Geometris W - Sayap Kiri */}
      <path
        d="M 10 18 L 15.5 32 C 15.9 33 17 33 17.4 32 L 20.8 23 H 17.5 L 14.8 29.5 L 12.2 18 H 10 Z"
        fill="url(#wos-emerald-grad)"
        filter="url(#wos-glow)"
      />

      {/* Monogram Geometris W - Sayap Kanan */}
      <path
        d="M 34 18 L 28.5 32 C 28.1 33 27 33 26.6 32 L 23.2 23 H 26.5 L 29.2 29.5 L 31.8 18 H 34 Z"
        fill="url(#wos-emerald-grad)"
        filter="url(#wos-glow)"
      />

      {/* Inti Transaksi POS (Pusat Chevron & Node Kasir) */}
      <path
        d="M 22 18 L 25 24 L 22 28.5 L 19 24 Z"
        fill="#34D399"
      />

      {/* Node status aktif (LED retail OS di tengah) */}
      <circle cx="22" cy="23.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

/**
 * Full Brand Lockup: Custom Icon + Typographic Identity + OS Micro-Badge
 */
export function BrandLogo({ size = "md", subtitle, className }: BrandLogoProps) {
  const iconSizes = {
    sm: "sm" as const,
    md: "md" as const,
    lg: "lg" as const,
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const badgeSizes = {
    sm: "text-[9px] px-1 py-0.2",
    md: "text-[10px] px-1.5 py-0.5",
    lg: "text-xs px-2 py-0.5",
  };

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <BrandIcon size={iconSizes[size]} />
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={cn("font-black tracking-tight text-white", textSizes[size])}>
            Warung
          </span>
          <span
            className={cn(
              "font-mono font-black rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 tracking-wider uppercase inline-block shadow-sm shadow-emerald-950/50",
              badgeSizes[size]
            )}
          >
            OS
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium truncate mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
