/**
 * WarungOS Theme Configuration
 * =========================================================================
 * PUSAT PENGATURAN WARNA, FONT, DAN EFEK GLASSMORPHISM
 * 
 * Desain: Modern Retail & Fintech (Clean Obsidian + Crisp Emerald & Slate)
 * Bebas dari gradasi ungu generik / AI slop. Tampilan profesional, clean, dan fokus transaksi.
 * =========================================================================
 */

export const themeConfig = {
  // IDENTITAS BRAND
  appName: "WarungOS",
  appTagline: "Sistem Manajemen Warung & Kasir UMKM",

  // TIPOGRAFI / FONT
  fonts: {
    sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  // PALET WARNA (Clean Commercial: Obsidian Dark, Emerald Accent, Crisp Slate)
  colors: {
    // Primary: Emerald (Simbol keuntungan, kasir, ritel profesional)
    primary: {
      light: "#34D399", // Emerald 400
      DEFAULT: "#059669", // Emerald 600
      dark: "#047857", // Emerald 700
      glow: "rgba(5, 150, 105, 0.2)",
    },
    // Secondary: Cool Steel Slate
    secondary: {
      light: "#94A3B8", // Slate 400
      DEFAULT: "#475569", // Slate 600
      dark: "#334155", // Slate 700
    },
    // Accent: Crisp Amber (Peringatan & stok)
    accent: {
      light: "#FBBF24", // Amber 400
      DEFAULT: "#D97706", // Amber 600
      dark: "#B45309", // Amber 700
    },
    // Status Warna
    success: {
      DEFAULT: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.25)",
    },
    warning: {
      DEFAULT: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.25)",
    },
    danger: {
      DEFAULT: "#EF4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.25)",
    },
  },

  // EFEK GLASSMORPHISM
  // Efek kaca frosted yang elegan dan subtle, bukan glow berlebihan
  glass: {
    card: {
      background: "rgba(255, 255, 255, 0.035)",
      border: "rgba(255, 255, 255, 0.08)",
      blur: "backdrop-blur-xl",
      shadow: "shadow-[0_8px_30px_rgb(0_0_0/0.4)]",
    },
    cardHover: {
      background: "rgba(255, 255, 255, 0.06)",
      border: "rgba(255, 255, 255, 0.15)",
    },
    button: {
      background: "rgba(255, 255, 255, 0.07)",
      border: "rgba(255, 255, 255, 0.12)",
    },
    input: {
      background: "rgba(15, 23, 42, 0.6)",
      border: "rgba(255, 255, 255, 0.1)",
      focusBorder: "#10B981",
    },
    sidebar: {
      background: "rgba(11, 15, 23, 0.85)",
      border: "rgba(255, 255, 255, 0.06)",
      blur: "backdrop-blur-2xl",
    },
  },
};
