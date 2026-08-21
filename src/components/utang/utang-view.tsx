"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

type DebtItem = {
  id: string; noFaktur: string; namaPbf: string; namaObat: string;
  totalHutang: number; sudahDibayar: number; sisaHutang: number;
  jatuhTempo: string; status: "LUNAS" | "BELUM_LUNAS" | "JATUH_TEMPO";
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  LUNAS: { label: "Lunas", color: "bg-brand-100 text-brand-700" },
  BELUM_LUNAS: { label: "Belum Lunas", color: "bg-amber-100 text-amber-700" },
  JATUH_TEMPO: { label: "Jatuh Tempo", color: "bg-red-100 text-red-700" },
};

export function UtangFakturView({ initialData, canEdit }: { initialData: DebtItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [payItem, setPayItem] = useState<DebtItem | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  async function submitPayment() {
    if (!payItem) return;
    const bayar = parseFloat(amount) || 0;
    if (bayar <= 0 || bayar > payItem.sisaHutang) {
      toast.error("Jumlah pembayaran tidak valid");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/debts/${payItem.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: bayar }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal mencatat pembayaran");

      setData((prev) => prev.map((d) => {
        if (d.id !== payItem.id) return d;
        const sudahDibayar = d.sudahDibayar + bayar;
        const sisaHutang = d.totalHutang - sudahDibayar;
        return { ...d, sudahDibayar, sisaHutang, status: sisaHutang <= 0 ? "LUNAS" : d.status };
      }));
      toast.success("Pembayaran berhasil dicatat");
      setPayItem(null);
      setAmount("");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mencatat pembayaran");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">No Faktur</th>
                <th className="text-left px-4 py-2.5">PBF</th>
                <th className="text-left px-4 py-2.5">Obat</th>
                <th className="text-right px-4 py-2.5">Total Hutang</th>
                <th className="text-right px-4 py-2.5">Sudah Dibayar</th>
                <th className="text-right px-4 py-2.5">Sisa</th>
                <th className="text-left px-4 py-2.5">Jatuh Tempo</th>
                <th className="text-left px-4 py-2.5">Status</th>
                {canEdit && <th className="text-right px-4 py-2.5">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Belum ada data hutang/faktur</td></tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{d.noFaktur}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.namaPbf}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.namaObat}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatRupiah(d.totalHutang)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatRupiah(d.sudahDibayar)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatRupiah(d.sisaHutang)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatTanggal(d.jatuhTempo)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_LABEL[d.status].color}`}>
                        {STATUS_LABEL[d.status].label}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          disabled={d.status === "LUNAS"}
                          onClick={() => setPayItem(d)}
                          className="text-xs font-medium text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline"
                        >
                          Bayar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Bayar Hutang</h3>
              <button onClick={() => setPayItem(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Sisa hutang <span className="font-medium text-slate-700">{formatRupiah(payItem.sisaHutang)}</span> ke {payItem.namaPbf}
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Jumlah pembayaran"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            <button
              onClick={submitPayment}
              disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Konfirmasi Pembayaran
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
