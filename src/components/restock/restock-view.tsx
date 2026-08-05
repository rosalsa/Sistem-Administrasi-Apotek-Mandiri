"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PackagePlus } from "lucide-react";
import { restockSchema, type RestockFormValues } from "@/types";
import { formatTanggal } from "@/lib/utils";
import { toast } from "sonner";

type MedicineOption = { id: string; name: string; isiPerBox: number; stok?: number };
type RiwayatItem = { id: string; tanggal: string; namaObat: string; jumlah: number; expired: string; petugas: string };

export function RestockView({
  medicines, initialRiwayat,
}: { medicines: MedicineOption[]; initialRiwayat: RiwayatItem[] }) {
  const router = useRouter();
  const [riwayat, setRiwayat] = useState(initialRiwayat);
  const [loading, setLoading] = useState(false);
  const [searchObat, setSearchObat] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setRiwayat(initialRiwayat);
  }, [initialRiwayat]);
  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors },
  } = useForm<RestockFormValues>({ resolver: zodResolver(restockSchema) });

  const medicineId = watch("medicineId");
  const jumlahBox = watch("jumlahBox") || 0;
  const isiPerBox = watch("isiPerBox") || 0;
  const hutangKePbf = watch("hutangKePbf");
  const hasHutang = !!hutangKePbf && Number(hutangKePbf) > 0;
  const totalMasuk = jumlahBox * isiPerBox;
  const selectedMedicine = medicines.find((m) => m.id === medicineId);
  const stokSaatIni = selectedMedicine?.stok ?? 0;

  const filteredMedicines = medicines.filter((m) =>
    !searchObat || m.name.toLowerCase().includes(searchObat.toLowerCase())
  );

  function handleMedicineChange(id: string) {
    setValue("medicineId", id);
    const med = medicines.find((m) => m.id === id);
    if (med) {
      setValue("isiPerBox", med.isiPerBox);
      setSearchObat(med.name);
    }
    setDropdownOpen(false);
  }

  async function onSubmit(values: RestockFormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal menyimpan restock");

      const medName = medicines.find((m) => m.id === values.medicineId)?.name ?? "-";
      setRiwayat((prev) => [{
        id: json.data.id,
        tanggal: json.data.createdAt ?? new Date().toISOString(),
        namaObat: medName,
        jumlah: values.jumlahBox * values.isiPerBox,
        expired: new Date(values.expiredBatch).toISOString(),
        petugas: "Anda",
      }, ...prev]);

      toast.success("Restock berhasil disimpan, stok otomatis bertambah");
      reset();
      setSearchObat("");
      router.refresh(); // sinkronkan stok & riwayat terbaru dari server
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan restock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 bg-white rounded-xl border p-5 space-y-4 h-fit">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-emerald-600" /> Form Restock
        </h3>

        <div className="space-y-1 relative">
          <label className="text-sm font-medium text-slate-700">Cari & Pilih Obat</label>
          <input
            type="text"
            value={searchObat}
            onChange={(e) => {
              setSearchObat(e.target.value);
              setDropdownOpen(true);
              if (!e.target.value) setValue("medicineId", "");
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Ketik nama obat untuk mencari..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {dropdownOpen && filteredMedicines.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {filteredMedicines.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMedicineChange(m.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-b last:border-0"
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
          {errors.medicineId && <p className="text-xs text-red-500">{errors.medicineId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Jumlah Box</label>
            <input type="number" {...register("jumlahBox")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="0" />
            {errors.jumlahBox && <p className="text-xs text-red-500">{errors.jumlahBox.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Isi per Box</label>
            <input type="number" {...register("isiPerBox")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="0" />
            {errors.isiPerBox && <p className="text-xs text-red-500">{errors.isiPerBox.message}</p>}
          </div>
        </div>

        {medicineId && (
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Sisa Stok Saat Ini</span>
              <span className="font-medium text-slate-700">{stokSaatIni} unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Masuk</span>
              <span className="font-semibold text-slate-800">{totalMasuk} unit</span>
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <span className="text-slate-500">Stok Setelah Restock</span>
              <span className="font-semibold text-emerald-600">{stokSaatIni + totalMasuk} unit</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Expired Batch</label>
          <input type="date" {...register("expiredBatch")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          {errors.expiredBatch && <p className="text-xs text-red-500">{errors.expiredBatch.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nomor Faktur</label>
          <input {...register("noFaktur")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="FKT-0001" />
          {errors.noFaktur && <p className="text-xs text-red-500">{errors.noFaktur.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Hutang ke PBF (opsional)</label>
          <input type="number" {...register("hutangKePbf")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="0" />
          {errors.hutangKePbf && <p className="text-xs text-red-500">{errors.hutangKePbf.message}</p>}
        </div>

        {hasHutang && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Jatuh Tempo Hutang</label>
            <input type="date" {...register("jatuhTempoHutang")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            {errors.jatuhTempoHutang && <p className="text-xs text-red-500">{errors.jatuhTempoHutang.message}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Restock
        </button>
      </form>

      <div className="lg:col-span-3 bg-white rounded-xl border overflow-hidden h-fit">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-slate-800">Riwayat Restock</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Tanggal</th>
                <th className="text-left px-4 py-2.5">Nama Obat</th>
                <th className="text-left px-4 py-2.5">Jumlah</th>
                <th className="text-left px-4 py-2.5">Expired</th>
                <th className="text-left px-4 py-2.5">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {riwayat.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Belum ada riwayat restock</td></tr>
              ) : (
                riwayat.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{formatTanggal(r.tanggal, true)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.namaObat}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.jumlah} unit</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatTanggal(r.expired)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.petugas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
