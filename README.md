# Sistem Informasi Operasional Apotek

Aplikasi ini merupakan sistem informasi operasional apotek yang dibangun menggunakan **Next.js (App Router)**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, dan **NextAuth**. Project ini dibuat untuk membantu pengelolaan operasional apotek, mulai dari manajemen data obat, restock, transaksi penjualan, hingga pembuatan laporan.

## Teknologi yang Digunakan

* Next.js (App Router)
* TypeScript
* Prisma ORM
* PostgreSQL
* NextAuth
* Tailwind CSS
* React Hook Form
* Zod

## Fitur

Beberapa fitur yang sudah tersedia pada project ini antara lain:

* Login menggunakan NextAuth (Credentials)
* Role Based Access Control (RBAC)
* Dashboard
* Manajemen Data Obat
* Restock Obat
* Transaksi Penjualan
* Riwayat Penjualan
* Monitoring Stok
* Kelola Utang/Faktur
* Laporan Penjualan
* Ganti Password

Selain itu sudah tersedia middleware untuk pembatasan akses berdasarkan role, validasi form menggunakan Zod, utilitas format rupiah dan tanggal Indonesia, serta contoh implementasi transaksi menggunakan Prisma.

## Kondisi Project

Saat ini project sudah memiliki struktur utama yang dapat langsung dikembangkan. Sebagian besar halaman, database, autentikasi, dan routing sudah tersedia.

Masih terdapat beberapa fitur yang perlu disempurnakan, terutama pada bagian integrasi antara frontend dan API karena beberapa komponen masih menggunakan data sementara selama proses pengembangan.

## Pengembangan Selanjutnya

Beberapa bagian yang masih dapat dikembangkan di antaranya:

* Menghubungkan seluruh form ke API Route.
* Melengkapi endpoint CRUD Data Obat.
* Menambahkan endpoint pembayaran utang/faktur.
* Menyelesaikan fitur ganti password.
* Menambahkan import data Excel/CSV.
* Menambahkan export laporan ke PDF dan Excel.
* Mengimplementasikan sistem FEFO (First Expired First Out) pada proses penjualan berdasarkan batch obat.

## Instalasi

Install dependency terlebih dahulu.

```bash
npm install
```

Salin file environment.

```bash
cp .env.example .env
```

Kemudian sesuaikan konfigurasi berikut.

```env
DATABASE_URL=
NEXTAUTH_SECRET=
```

Generate Prisma Client dan jalankan migrasi.

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Import data awal.

```bash
npm run prisma:seed
```

Jalankan project.

```bash
npm run dev
```

Aplikasi dapat diakses melalui:

```
http://localhost:3000
```

## Akun Demo

| Role     | Username   | Password      |
| -------- | ---------- | ------------- |
| Apoteker | `apoteker` | `password123` |
| Asisten  | `asisten`  | `password123` |
| PSA      | `psa`      | `password123` |

## Struktur Project

```text
apotek/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── (dashboard)/
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
│   │   │   ├── sales/
│   │   │   └── restock/
│   │   └── unauthorized/
│   ├── components/
│   ├── lib/
│   └── types/
└── README.md
```

## Catatan

* Menggunakan format mata uang Rupiah (`id-ID`).
* Menggunakan format tanggal Indonesia.
* Status stok dibedakan menjadi Aman, Menipis, dan Habis.
* Monitoring masa berlaku obat mendukung status Aman, Akan Expired, dan Sudah Expired.
* Struktur database sudah mendukung pencatatan batch obat sehingga dapat dikembangkan menjadi sistem FEFO.
