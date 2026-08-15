"use client";

import { useEffect, useMemo, useState } from "react";
import { getStockStatus, getExpiredStatus, formatTanggal } from "@/lib/utils";
import { EOQ_STATUS_LABEL, EOQ_STATUS_COLOR, DEFAULT_ORDERING_COST, DEFAULT_HOLDING_COST_PERCENT } from "@/lib/eoq";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Loader2, Info } from "lucide-react";

type MedicineItem = { id: string; name: string; stok: number; minStok: number; expiredTerdekat: string | null };
type Category = "habis" | "menipis" | "akan-expired" | "expired";

type EoqItem = {
  id: string; name: string; stok: number; minStok: number;
  annualDemand: number; eoq: number; saranPembelian: number; status: keyof typeof EOQ_STATUS_LABEL;
};

// Kategori yang berkaitan dengan jumlah stok (bukan kadaluarsa) -> di sini rekomendasi EOQ ditampilkan
const EOQ_RELEVANT: Category[] = ["habis", "menipis"];

export function MonitoringStokView({ medicines }: { medicines: MedicineItem[] }) {
  const [category, setCategory] = useState<Category>("habis");

  const categorized = useMemo(() => {
    const habis = medicines.filter((m) => m.stok <= 0);
    const menipis = medicines.filter((m) => m.stok > 0 && m.stok <= m.minStok);
    const akanExpired = medicines.filter((m) => m.expiredTerdekat && getExpiredStatus(m.expiredTerdekat).label === "Akan Expired");
    const expired = medicines.filter((m) => m.expiredTerdekat && getExpiredStatus(m.expiredTerdekat).label === "Sudah Expired");
    return { habis, menipis, "akan-expired": akanExpired, expired };
  }, [medicines]);

  const TABS: { key: Category; label: string; count: number; color: string }[] = [
    { key: "habis", label: "Stok Habis", count: categorized.habis.length, color: "red" },
    { key: "menipis", label: "Stok Menipis", count: categorized.menipis.length, color: "yellow" },
    { key: "akan-expired", label: "Akan Expired", count: categorized["akan-expired"].length, color: "yellow" },
    { key: "expired", label: "Sudah Expired", count: categorized.expired.length, color: "red" },
  ];

  const colorMap: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  const activeList = categorized[category];
  const showEoq = EOQ_RELEVANT.includes(category);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCategory(t.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${category === t.key ? colorMap[t.color] : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-2xl font-bold">{t.count}</p>
            <p className="text-sm mt-0.5">{t.label}</p>
          </button>
        ))}
      </div>

      {showEoq && (
        <EoqSection medicineIds={activeList.map((m) => m.id)} colorMap={colorMap} categoryLabel={TABS.find((t) => t.key === category)!.label} />
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nama Obat</th>
                <th className="text-left px-4 py-2.5">Stok</th>
                <th className="text-left px-4 py-2.5">Status Stok</th>
                <th className="text-left px-4 py-2.5">Expired Terdekat</th>
                <th className="text-left px-4 py-2.5">Status Expired</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada data pada kategori ini</td></tr>
              ) : (
                activeList.map((m) => {
                  const stockStatus = getStockStatus(m.stok, m.minStok);
                  const expStatus = m.expiredTerdekat ? getExpiredStatus(m.expiredTerdekat) : null;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{m.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{m.stok}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${colorMap[stockStatus.color]}`}>{stockStatus.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{m.expiredTerdekat ? formatTanggal(m.expiredTerdekat) : "-"}</td>
                      <td className="px-4 py-2.5">
                        {expStatus && (
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${colorMap[expStatus.color]}`}>{expStatus.label}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EoqSection({
  medicineIds, colorMap, categoryLabel,
}: { medicineIds: string[]; colorMap: Record<string, string>; categoryLabel: string }) {
  const [orderingCost, setOrderingCost] = useState(DEFAULT_ORDERING_COST);
  const [holdingCostPercent, setHoldingCostPercent] = useState(DEFAULT_HOLDING_COST_PERCENT);
  const [allData, setAllData] = useState<EoqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);

  async function loadData(oc: number, hc: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitoring/eoq?orderingCost=${oc}&holdingCostPercent=${hc}`);
      const json = await res.json();
      setAllData(json?.data ?? []);
    } catch {
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(orderingCost, holdingCostPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleHitung() {
    setHasCalculated(true);
    loadData(orderingCost, holdingCostPercent);
  }

  // Hanya tampilkan rekomendasi EOQ untuk obat yang sedang ada di kategori tab aktif (habis / menipis)
  const idSet = useMemo(() => new Set(medicineIds), [medicineIds]);
  const data = useMemo(
    () => allData.filter((d) => idSet.has(d.id)).sort((a, b) => b.saranPembelian - a.saranPembelian),
    [allData, idSet]
  );

  // Grafik hanya menampilkan obat yang EOQ-nya berhasil dihitung (data penjualan cukup)
  const chartableData = useMemo(() => data.filter((d) => d.status !== "DATA_KURANG" && d.eoq > 0), [data]);
  const excludedCount = data.length - chartableData.length;

  const chartData = useMemo(
    () =>
      chartableData
        .slice(0, 10)
        .map((d) => ({ name: d.name.length > 14 ? d.name.slice(0, 14) + "…" : d.name, "Stok Saat Ini": d.stok, "EOQ (Jumlah Optimal)": d.eoq })),
    [chartableData]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start gap-2 text-slate-500 mb-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Rekomendasi EOQ (Economic Order Quantity) untuk obat pada tab <strong>{categoryLabel}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Biaya Pemesanan / Order (Rp)</label>
            <input
              type="number"
              value={orderingCost}
              onChange={(e) => setOrderingCost(Number(e.target.value) || 0)}
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Biaya Penyimpanan (% harga beli/tahun)</label>
            <input
              type="number"
              value={holdingCostPercent}
              onChange={(e) => setHoldingCostPercent(Number(e.target.value) || 0)}
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleHitung}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Hitung Ulang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-slate-800 mb-4">Grafik Stok vs EOQ — {categoryLabel}</h3>
        {!hasCalculated ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 gap-1 border-2 border-dashed rounded-lg">
            <p className="text-sm font-medium">Area Grafik</p>
            <p className="text-xs">Klik tombol "Hitung Ulang" untuk menampilkan grafik perbandingan stok vs EOQ</p>
          </div>
        ) : loading ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 gap-1">
            <p className="text-sm font-medium">Belum ada obat yang berhasil dihitung EOQ-nya</p>
            <p className="text-xs">Data penjualan obat di kategori ini belum mencukupi untuk perhitungan EOQ</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Stok Saat Ini" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="EOQ (Jumlah Optimal)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {excludedCount > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {excludedCount} obat lain tidak ditampilkan di grafik karena data penjualannya belum mencukupi untuk perhitungan EOQ.
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nama Obat</th>
                <th className="text-left px-4 py-2.5">Permintaan / Tahun</th>
                <th className="text-left px-4 py-2.5">Stok Saat Ini</th>
                <th className="text-left px-4 py-2.5">EOQ (Jumlah Optimal)</th>
                <th className="text-left px-4 py-2.5">Saran Pembelian</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada data obat pada kategori ini</td></tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{d.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.annualDemand.toLocaleString("id-ID")} unit</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.stok}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.eoq.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.saranPembelian > 0 ? `${d.saranPembelian.toLocaleString("id-ID")} unit` : "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${colorMap[EOQ_STATUS_COLOR[d.status]]}`}>
                        {EOQ_STATUS_LABEL[d.status]}
                      </span>
                    </td>
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
