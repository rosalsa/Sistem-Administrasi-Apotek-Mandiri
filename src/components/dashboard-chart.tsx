"use client";

import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatRupiah } from "@/lib/utils";

// Data contoh — di implementasi nyata, fetch dari /api/dashboard/chart?range=monthly|yearly
const MONTHLY_DATA = [
  { label: "1", total: 1200000 }, { label: "5", total: 1800000 }, { label: "10", total: 1500000 },
  { label: "15", total: 2400000 }, { label: "20", total: 2100000 }, { label: "25", total: 2800000 },
  { label: "30", total: 3200000 },
];
const YEARLY_DATA = [
  { label: "Jan", total: 32000000 }, { label: "Feb", total: 28000000 }, { label: "Mar", total: 35000000 },
  { label: "Apr", total: 31000000 }, { label: "Mei", total: 40000000 }, { label: "Jun", total: 38000000 },
  { label: "Jul", total: 42000000 },
];

export function DashboardChart() {
  const [range, setRange] = useState<"monthly" | "yearly">("monthly");
  const data = range === "monthly" ? MONTHLY_DATA : YEARLY_DATA;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Statistik Pendapatan</h3>
        <div className="flex bg-slate-100 rounded-lg p-1 text-xs">
          <button
            onClick={() => setRange("monthly")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${range === "monthly" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500"}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setRange("yearly")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${range === "yearly" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500"}`}
          >
            Tahunan
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
          />
          <Tooltip
            formatter={(value: number) => formatRupiah(value)}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} fill="url(#colorTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
