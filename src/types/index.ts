import { z } from "zod";

export const RoleEnum = z.enum(["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"]);
export type RoleType = z.infer<typeof RoleEnum>;

export const MedicineTypeEnum = z.string().min(1, "Jenis obat wajib diisi");

// ---------- Data Obat ----------
const medicineBaseFields = {
  name: z.string().min(3, "Nama obat minimal 3 karakter"),
  type: MedicineTypeEnum,
  hargaBeli: z.coerce.number().positive("Harga beli harus lebih dari 0"),
  hargaJualMedis1: z.coerce.number().positive("Harga jual medis 1 harus lebih dari 0"),
  hargaJualMedis2: z.coerce.number().positive("Harga jual medis 2 harus lebih dari 0"),
  hargaJualMedis3: z.coerce.number().positive("Harga jual medis 3 harus lebih dari 0"),
  hargaJualUmum: z.coerce.number().positive("Harga jual umum harus lebih dari 0"),
  supplierName: z.string().min(1, "Nama PBF wajib diisi"),
  manufacturerName: z.string().min(1, "Nama pabrik wajib diisi"),
  hutangKePbf: z.coerce.number().min(0).optional(),
  jatuhTempoHutang: z.string().optional(),
  minStok: z.coerce.number().int().min(0).default(10),
};

// Dipakai saat menambah obat baru — wajib isi data stok awal & faktur
export const medicineSchema = z.object({
  ...medicineBaseFields,
  noFaktur: z.string().min(1, "Nomor faktur wajib diisi"),
  expiredDate: z.string().min(1, "Tanggal expired wajib diisi"),
  stokAwalBox: z.coerce.number().int().min(0),
  isiPerBox: z.coerce.number().int().positive("Isi per box minimal 1"),
}).refine(
  (data) => new Date(data.expiredDate) > new Date(),
  { message: "Tanggal expired harus di masa depan", path: ["expiredDate"] }
);
export type MedicineFormValues = z.infer<typeof medicineSchema>;

// Dipakai saat edit — tidak perlu mengisi ulang faktur/stok awal/tanggal expired
export const medicineEditSchema = z.object(medicineBaseFields);
export type MedicineEditFormValues = z.infer<typeof medicineEditSchema>;

// ---------- Restock ----------
export const restockSchema = z.object({
  medicineId: z.string().min(1, "Pilih obat terlebih dahulu"),
  jumlahBox: z.coerce.number().int().positive("Jumlah box minimal 1"),
  isiPerBox: z.coerce.number().int().positive("Isi per box minimal 1"),
  expiredBatch: z.string().min(1, "Tanggal expired wajib diisi"),
  noFaktur: z.string().min(1, "Nomor faktur wajib diisi"),
  hutangKePbf: z.coerce.number().min(0).optional(),
  jatuhTempoHutang: z.string().optional(),
});
export type RestockFormValues = z.infer<typeof restockSchema>;

// ---------- Kelola Akun (Ganti Nama & Password per akun) ----------
export const accountUpdateSchema = z
  .object({
    name: z.string().min(3, "Nama minimal 3 karakter"),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine((data) => !data.newPassword || data.newPassword.length >= 8, {
    message: "Password baru minimal 8 karakter",
    path: ["newPassword"],
  })
  .refine((data) => !data.newPassword || data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
export type AccountUpdateValues = z.infer<typeof accountUpdateSchema>;

// ---------- Domain Types (untuk dipakai di UI, hasil query prisma) ----------
export interface MedicineListItem {
  id: string;
  name: string;
  type: string;
  stok: number;
  minStok: number;
  hargaBeli: number;
  hargaJualMedis1: number;
  hargaJualMedis2: number;
  hargaJualMedis3: number;
  hargaJualUmum: number;
  expiredTerdekat: string | null;
  supplierName: string | null;
  manufacturerName: string | null;
}

export interface CartItem {
  medicineId: string;
  name: string;
  hargaType: "MEDIS" | "UMUM";
  hargaSatuan: number;
  qty: number;
  stokTersedia: number;
}

export interface DashboardSummary {
  pendapatanHariIni: number;
  pendapatanBulanIni: number;
  totalTransaksiHariIni: number;
  totalJenisObat: number;
  totalStok: number;
  obatHampirHabis: number;
  obatHampirExpired: number;
}
