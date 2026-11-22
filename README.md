# WarungOS — Cloud POS & Retail Management SaaS

> **SaaS Modern untuk Pengelolaan Warung Kelontong & Ritel Kecil Indonesia**  
> Dibangun berdasarkan spesifikasi PRD v1.0 dan WarungOS Customer Kit, dengan arsitektur **Next.js 16 + React 19 + TypeScript + Prisma 6 + SQLite (Dev) / Neon PostgreSQL (Prod)** dan antarmuka **Bespoke Glassmorphism** (Matte Obsidian + Crisp Emerald).

---

## 📋 Daftar Isi

1. [Fitur Utama & Pemetaan PRD](#-fitur-utama--pemetaan-prd)
2. [Desain Glassmorphism & Penyesuaian Tema](#-desain-glassmorphism--penyesuaian-tema)
3. [Arsitektur & Keamanan Multi-Tenancy](#-arsitektur--keamanan-multi-tenancy)
4. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
5. [Panduan Memulai Cepat (Quickstart)](#-panduan-memulai-cepat-quickstart)
6. [Akun Demo & Data Awal](#-akun-demo--data-awal)
7. [Pengujian Otomatis (Automated Test Suite)](#-pengujian-otomatis-automated-test-suite)
8. [Docker & Containerization](#-docker--containerization)
9. [Panduan Operasional & Customer Kit SOP](#-panduan-operasional--customer-kit-sop)

---

## 🚀 Fitur Utama & Pemetaan PRD

WarungOS mengimplementasikan seluruh kebutuhan pada PRD v1.0 secara bertahap:

### Fase 1: Foundation (Autentikasi & Multi-Tenancy)
- **AUTH-01 & TEN-01**: Registrasi atomik akun User + Warung (Tenant) + Kategori starter default dalam satu transaksi database.
- **AUTH-02 & AUTH-03**: Login aman berbasis JWT HTTP-only cookie (`jose`) dan BCrypt hashing (10 rounds).
- **TEN-02 & TEN-03**: Server-side tenant isolation (`requireTenantContext`), `tenant_id` tidak pernah diterima dari client input untuk mencegah kebocoran data antar-warung (cross-tenant data leak).

### Fase 2: Katalog Produk & Manajemen Inventori
- **PROD-01 & PROD-02**: CRUD Produk lengkap dengan validasi harga beli <= harga jual dan satuan standar (pcs, bks, btl, kg, sachet).
- **PROD-03**: SKU unik per tenant (produk warung A dapat menggunakan SKU yang sama dengan warung B tanpa bentrok).
- **INV-01**: Stok awal otomatis dicatat sebagai mutasi bertipe `OPENING_BALANCE`.
- **INV-02 & INV-03**: Audit ledger `stock_movements` tidak dapat dihapus (*immutable audit trail*). Penyesuaian stok manual wajib menyertakan alasan penyesuaian (SO, Rusak, Kadaluarsa, Retur).

### Fase 3: Kasir Point-of-Sale (POS) & Transaksi
- **POS-01**: Katalog produk responsif dengan pencarian real-time dan filter kategori.
- **POS-02**: Keranjang belanja interaktif dengan penyesuaian kuantitas instan.
- **POS-03**: Perhitungan pembayaran tunai cepat dengan tombol nominal instan (`Uang Pas`, `+10k`, `+20k`, `+50k`, `+100k`) serta kembalian otomatis.
- **POS-04**: Modal struk digital siap cetak format termal (80mm / 58mm).
- **BR-05**: Snapshot harga beli dan harga jual saat transaksi (`costPriceSnapshot`, `sellPriceSnapshot`). Perubahan harga produk di masa depan tidak merusak laporan historis.
- **BR-07**: Validasi stok ketat di server-side sebelum transaksi diproses (menolak transaksi jika stok tidak mencukupi).
- **BR-08**: Fitur Void transaksi yang mengembalikan saldo stok ke kondisi semula secara atomik dengan catatan audit log.

### Fase 4: Dashboard & Laporan Keuangan
- **DASH-01**: Ringkasan omzet harian, transaksi, laba kotor, dan peringatan stok menipis (*low stock warning*).
- **RPT-01**: Filter laporan penjualan berdasarkan rentang tanggal fleksibel (Hari ini, Kemarin, 7 Hari, 30 Hari, Bulan ini, Custom).
- **RPT-02**: Perhitungan akurat **Laba Kotor (Gross Profit = Omzet - HPP Snapshot)**.
- **RPT-03**: Analisis Produk Terlaris (*Top 10 Products*) dan kontribusi penjualan per kategori.
- **RPT-04**: Ekspor riwayat transaksi ke format file CSV untuk rekonsiliasi akuntansi warung.

### Fase 5: Pengaturan, Keamanan & Hardening
- **SET-01**: Manajemen profil warung (Nama, Jenis Usaha, Kota, Zona Waktu).
- **SET-02**: Keamanan akun (penggantian kata sandi dengan verifikasi password lama).
- **SYS-01**: Health check endpoint `/api/health` untuk Docker, Kubernetes, dan cloud uptime monitoring.

---

## 🎨 Desain Glassmorphism & Penyesuaian Tema

Sesuai preferensi visual pengguna, menggunakan palet modern **Fintech / Retail Pro**:

- **Latar Belakang**: *Matte Obsidian* (`#0B0F17`)
- **Aksen Utama**: *Crisp Emerald* (`#10B981` / `#059669`)
- **Sekunder & Border**: *Cool Slate* (`#64748B` / `#334155`)
- **Kartu & Modal**: Efek kaca frosted dengan `backdrop-blur-md`, border translusen tipis (`border-white/10`), dan shadow lembut.

### Kemudahan Mengatur Warna & Font
Semua variabel visual dikelola secara terpusat:
- **Konfigurasi Variabel**: [`src/lib/theme.ts`](src/lib/theme.ts)
- **Token CSS Variables**: [`src/app/globals.css`](src/app/globals.css)

Cukup ubah warna pada `theme.ts` atau variabel `--primary` di `globals.css` untuk mengubah seluruh tema aplikasi secara global.

---

## 🛡️ Arsitektur & Keamanan Multi-Tenancy

WarungOS menerapkan pola **Shared Database, Shared Schema dengan Discriminator Column (`tenant_id`)**:

1. **Server-Side Context Validation**: Fungsi `requireTenantContext()` di [`src/lib/tenant.ts`](src/lib/tenant.ts) memverifikasi relasi aktif antara user dan tenant di database pada setiap request.
2. **Compound Indexing**: Setiap tabel transaksi dan katalog memiliki index `[tenantId]` dan compound index seperti `[tenantId, receiptNo]` atau `[tenantId, sku]`.
3. **No Raw SQL**: Seluruh manipulasi data menggunakan Prisma Client berparameter untuk menjamin keamanan dari SQL Injection.
4. **BCrypt Hashing**: Password disimpan menggunakan salted hash BCrypt (10 rounds).

---

## 📂 Struktur Direktori Proyek

```text
warungos/
├── prisma/
│   ├── schema.prisma            # Schema SQLite (Pengembangan Lokal)
│   ├── schema.postgresql.prisma # Schema PostgreSQL (Produksi Neon/Render)
│   └── seed.ts                  # Seeder data Customer Kit
├── src/
│   ├── actions/                 # Next.js Server Actions (Auth, Products, POS, Reports, Settings)
│   │   ├── auth.ts
│   │   ├── categories.ts
│   │   ├── inventory.ts
│   │   ├── pos.ts
│   │   ├── products.ts
│   │   ├── reports.ts
│   │   └── settings.ts
│   ├── app/
│   │   ├── (auth)/              # Halaman Login & Registrasi
│   │   ├── (workspace)/         # Halaman Terproteksi (Dashboard, POS, Produk, Laporan, Pengaturan)
│   │   ├── api/health/          # Health check endpoint
│   │   ├── globals.css          # Glassmorphism tokens & CSS variables
│   │   └── layout.tsx
│   ├── components/              # Komponen UI Reusable
│   │   ├── ui/                  # GlassCard, GlassButton, GlassInput, GlassBadge, GlassModal
│   │   ├── layout/              # Sidebar, Header, MobileNav
│   │   ├── pos/                 # POS Cashier Client & Struk Digital
│   │   ├── products/            # Tabel Produk & Modal CRUD
│   │   ├── inventory/           # Riwayat Mutasi Stok & Penyesuaian
│   │   ├── reports/             # KPI Cards & Visual Chart Laba Kotor
│   │   └── settings/            # Pengaturan Warung & Profil Pengguna
│   └── lib/
│       ├── auth.ts              # JWT Token Session Cookies (jose)
│       ├── db.ts                # Prisma Client Singleton
│       ├── tenant.ts            # Tenant Context Server Enforcement
│       └── theme.ts             # Konfigurasi Sentral Tema & Font
├── scripts/                     # Automated Test Suites
│   ├── test-phase1-phase2.ts    # Verifikasi Auth & Katalog
│   ├── test-phase3.ts           # Verifikasi POS & Void
│   ├── test-phase4.ts           # Verifikasi Laporan & Laba Kotor
│   └── test-all-phases.ts       # Suite lengkap menyeluruh
├── Dockerfile                   # Multi-stage production container
└── docker-compose.yml           # Compose stack
```

---

## ⚡ Panduan Memulai Cepat (Quickstart)

### Prasyarat
- Node.js versi 20 atau lebih baru
- npm

### 1. Masuk ke direktori dan pasang dependensi
```bash
cd warungos
npm install
```

### 2. Inisialisasi Database Lokal & Seeding
```bash
npx prisma db push
npx prisma db seed
```

### 3. Jalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui browser di: `http://localhost:3000`

---

## 🔑 Akun Demo & Data Awal

Database lokal sudah terisi dengan data starter dari **WarungOS Customer Kit**:

| Parameter | Keterangan |
|---|---|
| **URL Aplikasi** | `http://localhost:3000/login` |
| **Email Login** | `owner@warungberkah.com` |
| **Kata Sandi** | `password123` |
| **Nama Warung** | Warung Berkah Mart |
| **Katalog Produk** | 10 Produk FMCG (Beras Ramos, Minyak Filma, Indomie Goreng, Aqua 600ml, dll.) |

---

## 🧪 Pengujian Otomatis (Automated Test Suite)

Untuk menjalankan seluruh uji otomatis (Fase 1 sampai Fase 5):

```bash
npx tsx scripts/test-all-phases.ts
```

Uji otomatis mencakup:
1. **Tenant Isolation**: Memverifikasi Warung A tidak dapat membaca/mengubah data Warung B.
2. **SKU Uniqueness Per Tenant**: Memverifikasi SKU yang sama diizinkan pada warung yang berbeda namun ditolak pada warung yang sama.
3. **Atomic POS Checkout**: Pengurangan stok otomatis, pembuatan snapshot harga, dan pencatatan mutasi `SALE`.
4. **Insufficient Stock Rejection**: Transaksi kasir ditolak jika stok kurang dari kuantitas pembelian.
5. **Snapshot Preservation**: Mengubah harga produk pada katalog tidak mengubah snapshot transaksi lampau.
6. **Atomic Transaction Void**: Pembatalan transaksi membalikkan saldo stok secara akurat dan mencatat mutasi `VOID`.
7. **Gross Profit Accuracy**: Memastikan `Laba Kotor = Grand Total - HPP Snapshot`.
8. **Health Check Endpoint**: Memastikan `/api/health` merespons status `UP`.

---

## 🐳 Docker & Containerization

### Menjalankan dengan Docker Compose
```bash
docker-compose up -d --build
```
Aplikasi akan aktif di port `3000`. Cek status kesehatan via:
```bash
curl http://localhost:3000/api/health
```

---

## 📖 Panduan Operasional & Customer Kit SOP

### Alur Tutup Kasir Harian (*Daily Closing SOP*)
1. Masuk ke menu **Laporan Penjualan**.
2. Pilih filter tanggal **Hari Ini**.
3. Cocokkan nilai **Uang Kas Fisik** di laci dengan **Total Omzet Tunai** di laporan.
4. Klik tombol **Unduh CSV** untuk menyimpan arsip harian.
5. Periksa kartu **Peringatan Stok Menipis** di Dashboard untuk membuat daftar belanja kulakan esok hari.

---

*Dikembangkan untuk memudahkan UMKM Indonesia naik kelas bersama WarungOS.*
