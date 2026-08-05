# Sistem Informasi Operasional Apotek

Kerangka project Next.js (App Router) + TypeScript + Prisma + PostgreSQL + NextAuth
untuk Sistem Informasi Operasional Apotek, sesuai spesifikasi yang diberikan.

## ⚠️ Status Project

Ini adalah **kerangka kerja (scaffold) yang siap dikembangkan**, bukan aplikasi yang 100% selesai.
Struktur database, autentikasi + RBAC, layout, dan semua halaman utama sudah dibuat dengan logika bisnis
inti (perhitungan stok otomatis, validasi form, dsb). Beberapa bagian masih menggunakan **data simulasi
di sisi client** (ditandai komentar `// TODO`) yang perlu Anda sambungkan ke API route yang sudah disediakan.

## Yang Sudah Dibuat

- ✅ Skema database lengkap (`prisma/schema.prisma`) — 14 tabel dengan relasi & index
- ✅ Autentikasi Credentials (NextAuth) dengan role APOTEKER / ASISTEN_APOTEKER / PSA
- ✅ Middleware RBAC (`middleware.ts`) yang membatasi akses halaman per role
- ✅ Sidebar dinamis sesuai hak akses role
- ✅ Halaman: Login, Dashboard, Data Obat, Restock, Penjualan (Kasir), Riwayat Penjualan,
  Monitoring Stok, Kelola Utang/Faktur, Laporan Penjualan, Ganti Password
- ✅ API route contoh dengan transaksi atomik Prisma: `/api/sales` (penjualan + kurangi stok
  otomatis) dan `/api/restock` (restock + tambah stok otomatis + audit log)
- ✅ Validasi form dengan React Hook Form + Zod
- ✅ Format Rupiah & tanggal Indonesia (`src/lib/utils.ts`)
- ✅ Toast notification, dialog konfirmasi, badge status stok/expired
- ✅ Seed data contoh (3 user, PBF, pabrik, 3 obat)

## Yang Perlu Anda Lanjutkan

1. **Sambungkan komponen client ke API**: beberapa komponen (form tambah obat, kasir, restock,
   ganti password) saat ini menyimpan perubahan hanya di state React (simulasi). Ganti bagian
   berkomentar `// TODO` dengan `fetch()` ke API route yang sesuai.
2. **Lengkapi API route** untuk `medicines` (CRUD), `debts` (pembayaran hutang), dan
   `change-password` — pola strukturnya sudah dicontohkan di `/api/sales` dan `/api/restock`.
3. **Install `shadcn/ui`** komponen sesuai kebutuhan (`npx shadcn@latest init` lalu
   `npx shadcn@latest add button dialog table ...`) jika ingin memakai komponen shadcn asli,
   alih-alih elemen HTML+Tailwind biasa yang saat ini dipakai agar scaffold tetap ringan.
4. **Import Excel/CSV** pada Data Obat: gunakan library `xlsx` (sudah ada di `package.json`)
   untuk parsing file di sisi client sebelum dikirim ke API.
5. **Export PDF/Excel** pada Laporan: gunakan `jspdf` + `jspdf-autotable` dan `xlsx`
   (sudah terpasang di `package.json`, tinggal diimplementasikan di `laporan-view.tsx`).
6. **FEFO (First Expired First Out)**: tabel `MedicineBatch` sudah dirancang untuk ini — saat
   penjualan, ambil batch dengan `expiredDate` terdekat lebih dulu saat mengurangi stok.

## Instalasi & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Siapkan database PostgreSQL, lalu salin .env.example -> .env
cp .env.example .env
# edit DATABASE_URL dan NEXTAUTH_SECRET di .env

# 3. Generate Prisma client & jalankan migrasi
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed data awal (3 akun contoh)
npm run prisma:seed

# 5. Jalankan development server
npm run dev
```

Buka http://localhost:3000 lalu login dengan salah satu akun berikut (password sama untuk semua):

| Role    | Username   | Password      |
|---------|-----------|---------------|
| Apoteker | `apoteker` | `password123` |
| Asisten  | `asisten`  | `password123` |
| PSA      | `psa`      | `password123` |

## Struktur Folder

```
apotek/
├── prisma/
│   ├── schema.prisma       # skema database lengkap
│   └── seed.ts             # data awal
├── middleware.ts           # RBAC per role
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── (dashboard)/    # grup route dengan layout sidebar+navbar
│   │   │   ├── dashboard/
│   │   │   ├── obat/
│   │   │   ├── restock/
│   │   │   ├── penjualan/
│   │   │   ├── riwayat-penjualan/
│   │   │   ├── monitoring-stok/
│   │   │   ├── utang-faktur/
│   │   │   ├── laporan/
│   │   │   └── ganti-password/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── sales/       # contoh transaksi penjualan atomik
│   │   │   └── restock/     # contoh transaksi restock atomik
│   │   └── unauthorized/
│   ├── components/          # komponen per fitur + ui/
│   ├── lib/                 # prisma client, auth config, utils
│   └── types/                # zod schema + TypeScript types
└── README.md
```

## Catatan Desain

- Warna utama: putih, hijau (`emerald-600`), biru (`blue-600`) sesuai permintaan.
- Semua angka uang diformat dengan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`.
- Semua tanggal diformat dengan locale `id-ID`.
- Status stok: **Aman** (hijau) / **Menipis** (kuning) / **Habis** (merah) — logika di `getStockStatus()`.
- Status expired: **Aman** / **Akan Expired** (H-90) / **Sudah Expired** — logika di `getExpiredStatus()`.
