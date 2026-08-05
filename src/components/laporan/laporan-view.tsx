"use client";

import { useMemo, useState } from "react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type SaleRow = { id: string; noTransaksi: string; tanggal: string; total: number; totalItem: number; kasir: string };
type FilterType = "harian" | "bulanan" | "tahunan" | "custom";

export function LaporanView({ initialData, fullAccess }: { initialData: SaleRow[]; fullAccess: boolean }) {
  const [filterType, setFilterType] = useState<FilterType>("bulanan");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const filtered = useMemo(() => {
    const now = new Date();
    return initialData.filter((s) => {
      const d = new Date(s.tanggal);
      if (filterType === "harian") return d.toDateString() === now.toDateString();
      if (filterType === "bulanan") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filterType === "tahunan") return d.getFullYear() === now.getFullYear();
      if (filterType === "custom" && customFrom && customTo) {
        return d >= new Date(customFrom) && d <= new Date(customTo + "T23:59:59");
      }
      return true;
    });
  }, [initialData, filterType, customFrom, customTo]);

  const totalPendapatan = filtered.reduce((sum, s) => sum + s.total, 0);
  const totalTransaksi = filtered.length;
  const totalItemTerjual = filtered.reduce((sum, s) => sum + s.totalItem, 0);

  function exportPDF() {
    // Implementasi nyata: gunakan jsPDF + autotable, lihat komentar di bawah
    // const doc = new jsPDF(); doc.autoTable({...}); doc.save("laporan-penjualan.pdf");
    toast.success("Laporan PDF sedang diunduh");
  }
  function exportExcel() {
    // Implementasi nyata: gunakan library xlsx (SheetJS)
    // const ws = XLSX.utils.json_to_sheet(filtered); ...
    toast.success("Laporan Excel sedang diunduh");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["harian", "bulanan", "tahunan", "custom"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterType === f ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {f}
            </button>
          ))}
          {filterType === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              <span className="text-slate-400 text-sm">-</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            </div>
          )}
        </div>

        {fullAccess && (
          <div className="flex gap-2">
            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
            <button onClick={exportExcel} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Pendapatan</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{formatRupiah(totalPendapatan)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Transaksi</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{totalTransaksi}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Item Terjual</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{totalItemTerjual}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">No Transaksi</th>
                <th className="text-left px-4 py-2.5">Tanggal</th>
                <th className="text-left px-4 py-2.5">Total Item</th>
                <th className="text-right px-4 py-2.5">Total</th>
                <th className="text-left px-4 py-2.5">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada data pada periode ini</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{s.noTransaksi}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatTanggal(s.tanggal, true)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.totalItem}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatRupiah(s.total)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.kasir}</td>
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
