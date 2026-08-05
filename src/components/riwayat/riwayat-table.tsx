"use client";

import { useMemo, useState } from "react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { Eye, X } from "lucide-react";

type SaleItem = { nama: string; qty: number; harga: number; subtotal: number };
type Sale = { id: string; noTransaksi: string; tanggal: string; total: number; kasir: string; items: SaleItem[] };

type FilterType = "harian" | "bulanan" | "tahunan" | "custom";

export function RiwayatPenjualanTable({ initialData }: { initialData: Sale[] }) {
  const [filterType, setFilterType] = useState<FilterType>("bulanan");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-2 items-center">
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

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">No Transaksi</th>
                <th className="text-left px-4 py-2.5">Tanggal</th>
                <th className="text-left px-4 py-2.5">Waktu</th>
                <th className="text-right px-4 py-2.5">Total</th>
                <th className="text-left px-4 py-2.5">Kasir</th>
                <th className="text-right px-4 py-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada transaksi pada periode ini</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{s.noTransaksi}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatTanggal(s.tanggal)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(s.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatRupiah(s.total)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.kasir}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setDetail(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-emerald-600" title="Detail">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-slate-800">{detail.noTransaksi}</h3>
                <p className="text-xs text-slate-500">{formatTanggal(detail.tanggal, true)} • Kasir: {detail.kasir}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {detail.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm border-b pb-2">
                  <div>
                    <p className="font-medium text-slate-700">{item.nama}</p>
                    <p className="text-xs text-slate-500">{item.qty} x {formatRupiah(item.harga)}</p>
                  </div>
                  <p className="font-medium text-slate-800">{formatRupiah(item.subtotal)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold text-slate-800">
                <span>Total</span>
                <span>{formatRupiah(detail.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
