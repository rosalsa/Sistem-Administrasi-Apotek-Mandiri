-- Tambah jenis obat baru: Tetes Telinga, Tetes Mata, Salep Mata
ALTER TYPE "MedicineType" ADD VALUE IF NOT EXISTS 'TETES_TELINGA';
ALTER TYPE "MedicineType" ADD VALUE IF NOT EXISTS 'TETES_MATA';
ALTER TYPE "MedicineType" ADD VALUE IF NOT EXISTS 'SALEP_MATA';

-- Tambah kolom persentase margin harga medis (12 / 15 / 8.5)
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "hargaMedisPersen" DECIMAL(5,2);
