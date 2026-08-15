-- Tambah role baru: PSA (Pemilik Sarana Apotek) — punya akses penuh ke semua fitur
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PSA';
