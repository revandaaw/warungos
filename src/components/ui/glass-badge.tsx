import React from "react";
import { cn } from "@/lib/utils";

interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
}

export function GlassBadge({
  children,
  className,
  variant = "neutral",
  size = "md",
  ...props
}: GlassBadgeProps) {
  const variantStyles = {
    primary: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    danger: "bg-red-500/10 text-red-300 border-red-500/25",
    neutral: "bg-white/[0.05] text-slate-300 border-white/10",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "glass-badge inline-flex items-center gap-1 font-medium tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
