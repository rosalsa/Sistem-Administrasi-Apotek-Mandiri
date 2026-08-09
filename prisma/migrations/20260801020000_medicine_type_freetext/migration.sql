-- Ubah kolom "type" pada tabel medicines dari enum MedicineType menjadi teks bebas,
-- supaya jenis obat baru bisa diketik manual (termasuk saat import file) tanpa
-- dibatasi daftar enum yang sudah ada di sistem.

ALTER TABLE "medicines" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- Enum lama tidak dipakai lagi, aman untuk dihapus
DROP TYPE IF EXISTS "MedicineType";
