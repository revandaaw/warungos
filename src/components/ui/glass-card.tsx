import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "gradient" | "outline";
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-6 relative overflow-hidden",
        variant === "interactive" && "glass-card-interactive cursor-pointer",
        variant === "gradient" && "bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-emerald-500/[0.04]",
        variant === "outline" && "bg-slate-900/40 border border-white/10",
        glow && "before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/5 before:to-sky-500/5 before:opacity-50 before:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
