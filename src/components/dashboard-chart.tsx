"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type ChartPoint = { label: string; total: number };

export function DashboardChart() {
  const [range, setRange] = useState<"monthly" | "yearly">("monthly");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/dashboard/chart?range=${range}`)
      .then((res) => res.json())
      .then((json) => {
        if (active) setData(json?.data ?? []);
      })
      .catch(() => {
        if (active) setData([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const hasRevenue = data.some((d) => d.total > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Statistik Pendapatan</h3>
        <div className="flex bg-slate-100 rounded-lg p-1 text-xs">
          <button
            onClick={() => setRange("monthly")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${range === "monthly" ? "bg-white shadow-sm text-brand-700" : "text-slate-500"}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setRange("yearly")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${range === "yearly" ? "bg-white shadow-sm text-brand-700" : "text-slate-500"}`}
          >
            Tahunan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !hasRevenue ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 gap-1">
          <p className="text-sm font-medium">Belum ada pendapatan</p>
          <p className="text-xs">Statistik akan muncul setelah ada transaksi penjualan</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00007F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00007F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
            />
            <Tooltip
              formatter={(value: number) => formatRupiah(value)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="total" stroke="#00007F" strokeWidth={2} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
