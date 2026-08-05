-- Ganti 1 kolom harga medis + persen menjadi 3 kolom harga medis manual
-- (Harga Jual Medis 1 = 12%, Harga Jual Medis 2 = 15%, Harga Jual Medis 3 = 8.5%)

-- Data lama di "hargaJualMedis" dipakai sebagai nilai awal untuk ketiga kolom baru
-- agar tidak ada harga yang hilang/kosong, silakan disesuaikan manual setelahnya.
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "hargaJualMedis1" DECIMAL(12,2);
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "hargaJualMedis2" DECIMAL(12,2);
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "hargaJualMedis3" DECIMAL(12,2);

UPDATE "medicines" SET
  "hargaJualMedis1" = COALESCE("hargaJualMedis1", "hargaJualMedis"),
  "hargaJualMedis2" = COALESCE("hargaJualMedis2", "hargaJualMedis"),
  "hargaJualMedis3" = COALESCE("hargaJualMedis3", "hargaJualMedis");

ALTER TABLE "medicines" ALTER COLUMN "hargaJualMedis1" SET NOT NULL;
ALTER TABLE "medicines" ALTER COLUMN "hargaJualMedis2" SET NOT NULL;
ALTER TABLE "medicines" ALTER COLUMN "hargaJualMedis3" SET NOT NULL;

ALTER TABLE "medicines" DROP COLUMN IF EXISTS "hargaJualMedis";
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "hargaMedisPersen";
