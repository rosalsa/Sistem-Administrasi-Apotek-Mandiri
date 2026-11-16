"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { Eye, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type SaleItem = { nama: string; qty: number; harga: number; subtotal: number };
type Sale = { id: string; noTransaksi: string; tanggal: string; total: number; kasir: string; items: SaleItem[] };

type FilterType = "harian" | "bulanan" | "tahunan" | "custom";

const PAGE_SIZE = 50;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Hitung rentang tanggal (YYYY-MM-DD) sesuai filter yang dipilih
function getRange(filterType: FilterType, customFrom: string, customTo: string): { from: string; to: string } | null {
  const now = new Date();
  if (filterType === "harian") return { from: ymd(now), to: ymd(now) };
  if (filterType === "bulanan") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: ymd(first), to: ymd(last) };
  }
  if (filterType === "tahunan") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  if (customFrom && customTo) return { from: customFrom, to: customTo };
  return null;
}

export function RiwayatPenjualanTable() {
  const [filterType, setFilterType] = useState<FilterType>("bulanan");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);

  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => getRange(filterType, customFrom, customTo), [filterType, customFrom, customTo]);

  // Kembali ke halaman 1 setiap kali filter/rentang berubah
  useEffect(() => {
    setPage(1);
  }, [range?.from, range?.to]);

  useEffect(() => {
    if (!range) {
      setRows([]);
      setTotal(0);
      setTotalPendapatan(0);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/sales/history?from=${range.from}&to=${range.to}&page=${page}&pageSize=${PAGE_SIZE}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Gagal memuat riwayat penjualan");
        setRows(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPendapatan(json.totalPendapatan ?? 0);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setRows([]);
        setTotal(0);
        setTotalPendapatan(0);
        setError(e?.message ?? "Gagal memuat riwayat penjualan");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range?.from, range?.to, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-2 items-center">
        {(["harian", "bulanan", "tahunan", "custom"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterType === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
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
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="text-center py-10 text-red-500">{error}</td></tr>
              ) : !range ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Pilih tanggal awal dan akhir untuk menampilkan transaksi</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada transaksi pada periode ini</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{s.noTransaksi}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatTanggal(s.tanggal)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(s.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatRupiah(s.total)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.kasir}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setDetail(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-brand-600" title="Detail">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {range && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500">
            <p>
              {total === 0
                ? "0 transaksi"
                : `Menampilkan ${startItem.toLocaleString("id-ID")}–${endItem.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} transaksi`}
              {total > 0 && <> · Total pendapatan periode ini <span className="font-semibold text-slate-700">{formatRupiah(totalPendapatan)}</span></>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs">Halaman {page} dari {totalPages.toLocaleString("id-ID")}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                title="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
