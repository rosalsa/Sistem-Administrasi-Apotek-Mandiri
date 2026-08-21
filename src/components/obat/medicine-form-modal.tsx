"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { useState } from "react";
import { medicineSchema, medicineEditSchema, type MedicineFormValues, type MedicineEditFormValues, type MedicineListItem } from "@/types";
import { toast } from "sonner";

const JENIS_OPTIONS = [
  "TABLET", "SIRUP", "AMPUL", "KAPSUL", "TUBE",
  "TETES_TELINGA", "TETES_MATA", "SALEP_MATA",
];
const JENIS_LABEL: Record<string, string> = {
  TABLET: "Tablet", SIRUP: "Sirup", AMPUL: "Ampul", KAPSUL: "Kapsul", TUBE: "Tube",
  TETES_TELINGA: "Tetes Telinga", TETES_MATA: "Tetes Mata", SALEP_MATA: "Salep Mata",
};
const OTHER_VALUE = "__OTHER__";

export function MedicineFormModal({
  initialData,
  onClose,
  onSave,
}: {
  initialData: MedicineListItem | null;
  onClose: () => void;
  onSave: (item: MedicineListItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(isEdit ? medicineEditSchema : medicineSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: JENIS_OPTIONS.includes(initialData.type) ? initialData.type : OTHER_VALUE,
          jenisLain: JENIS_OPTIONS.includes(initialData.type) ? "" : initialData.type,
          hargaBeli: initialData.hargaBeli,
          hargaJualMedis1: initialData.hargaJualMedis1,
          hargaJualMedis2: initialData.hargaJualMedis2,
          hargaJualMedis3: initialData.hargaJualMedis3,
          hargaJualUmum: initialData.hargaJualUmum,
          supplierName: initialData.supplierName ?? "",
          manufacturerName: initialData.manufacturerName ?? "",
          minStok: initialData.minStok,
        }
      : { minStok: 10, isiPerBox: 1, stokAwalBox: 0 },
  });

  const hutangKePbf = watch("hutangKePbf");
  const hasHutang = !!hutangKePbf && Number(hutangKePbf) > 0;
  const jenisWatch = watch("type");
  const isOtherJenis = jenisWatch === OTHER_VALUE;

  async function onSubmit(values: MedicineFormValues | MedicineEditFormValues) {
    const raw = values as any;
    const finalType = raw.type === OTHER_VALUE ? String(raw.jenisLain ?? "").trim() : raw.type;
    if (raw.type === OTHER_VALUE && !finalType) {
      toast.error("Jenis obat (manual) wajib diisi");
      return;
    }
    const payload = { ...raw, type: finalType };
    delete payload.jenisLain;

    setLoading(true);
    try {
      const res = await fetch(
        initialData ? `/api/medicines/${initialData.id}` : "/api/medicines",
        {
          method: initialData ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Data yang diisi belum valid, periksa kembali form");
      }

      const saved = json.data;
      const savedItem: MedicineListItem = {
        id: saved.id,
        name: saved.name,
        type: saved.type,
        stok: saved.stok ?? initialData?.stok ?? 0,
        minStok: saved.minStok,
        hargaBeli: Number(saved.hargaBeli),
        hargaJualMedis1: Number(saved.hargaJualMedis1),
        hargaJualMedis2: Number(saved.hargaJualMedis2),
        hargaJualMedis3: Number(saved.hargaJualMedis3),
        hargaJualUmum: Number(saved.hargaJualUmum),
        expiredTerdekat: !isEdit && (values as MedicineFormValues).expiredDate
          ? new Date((values as MedicineFormValues).expiredDate).toISOString()
          : initialData?.expiredTerdekat ?? null,
        supplierName: values.supplierName,
        manufacturerName: values.manufacturerName,
      };

      onSave(savedItem);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan data obat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">
            {initialData ? "Edit Data Obat" : "Tambah Obat Baru"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {isEdit && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Mode edit: cukup ubah data yang perlu diperbarui. Stok, nomor faktur, dan tanggal expired dikelola lewat menu Restock Obat.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Obat" error={errors.name?.message} full>
              <input {...register("name")} className="input" placeholder="Contoh: Paracetamol 500mg" />
            </Field>

            <Field label="Jenis Obat" error={errors.type?.message}>
              <select {...register("type")} className="input">
                <option value="">Pilih jenis</option>
                {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
                <option value={OTHER_VALUE}>Lainnya (ketik manual)</option>
              </select>
            </Field>

            {isOtherJenis && (
              <Field label="Jenis Obat (Manual)" error={errors.jenisLain?.message}>
                <input {...register("jenisLain")} className="input" placeholder="Contoh: Krim, Inhaler, dll" />
              </Field>
            )}

            {!isEdit && (
              <Field label="Nomor Faktur" error={errors.noFaktur?.message}>
                <input {...register("noFaktur")} className="input" placeholder="FKT-0001" />
              </Field>
            )}

            <Field label="Harga Beli" error={errors.hargaBeli?.message}>
              <input type="number" {...register("hargaBeli")} className="input" placeholder="0" />
            </Field>

            <Field label="Harga Jual Medis 1 (12%)" error={errors.hargaJualMedis1?.message}>
              <input type="number" {...register("hargaJualMedis1")} className="input" placeholder="0" />
            </Field>

            <Field label="Harga Jual Medis 2 (15%)" error={errors.hargaJualMedis2?.message}>
              <input type="number" {...register("hargaJualMedis2")} className="input" placeholder="0" />
            </Field>

            <Field label="Harga Jual Medis 3 (8.5%)" error={errors.hargaJualMedis3?.message}>
              <input type="number" {...register("hargaJualMedis3")} className="input" placeholder="0" />
            </Field>

            <Field label="Harga Jual Umum" error={errors.hargaJualUmum?.message}>
              <input type="number" {...register("hargaJualUmum")} className="input" placeholder="0" />
            </Field>

            {!isEdit && (
              <Field label="Tanggal Expired" error={errors.expiredDate?.message}>
                <input type="date" {...register("expiredDate")} className="input" />
              </Field>
            )}

            <Field label="Nama PBF" error={errors.supplierName?.message}>
              <input {...register("supplierName")} className="input" placeholder="Contoh: PT Kimia Farma Trading" />
            </Field>

            <Field label="Nama Pabrik" error={errors.manufacturerName?.message}>
              <input {...register("manufacturerName")} className="input" placeholder="Contoh: Kalbe Farma" />
            </Field>

            {!isEdit && (
              <>
                <Field label="Stok Awal (Box)" error={errors.stokAwalBox?.message}>
                  <input type="number" {...register("stokAwalBox")} className="input" placeholder="0" />
                </Field>

                <Field label="Isi per Box" error={errors.isiPerBox?.message}>
                  <input type="number" {...register("isiPerBox")} className="input" placeholder="1" />
                </Field>
              </>
            )}

            <Field label="Stok Minimum (Peringatan)" error={errors.minStok?.message}>
              <input type="number" {...register("minStok")} className="input" placeholder="10" />
            </Field>

            <Field label="Hutang ke PBF (opsional)" error={errors.hutangKePbf?.message}>
              <input type="number" {...register("hutangKePbf")} className="input" placeholder="0" />
            </Field>

            {hasHutang && (
              <Field label="Jatuh Tempo Hutang" error={errors.jatuhTempoHutang?.message}>
                <input type="date" {...register("jatuhTempoHutang")} className="input" />
              </Field>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 2px #00007F;
        }
      `}</style>
    </div>
  );
}

function Field({
  label, error, children, full = false,
}: { label: string; error?: any; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{String(error?.message ?? error)}</p>}
    </div>
  );
}
