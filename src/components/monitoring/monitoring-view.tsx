"use client";

import { useMemo, useState } from "react";
import { getStockStatus, getExpiredStatus, formatTanggal } from "@/lib/utils";

type MedicineItem = { id: string; name: string; stok: number; minStok: number; expiredTerdekat: string | null };
type Category = "habis" | "menipis" | "akan-expired" | "expired";

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
  };

  const activeList = categorized[category];

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
