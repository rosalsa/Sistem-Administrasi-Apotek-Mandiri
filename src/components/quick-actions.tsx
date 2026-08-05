"use client";

import Link from "next/link";
import { ShoppingCart, PackagePlus, PlusCircle, FileBarChart } from "lucide-react";

export function QuickActions({ role }: { role: string }) {
  const canSell = role === "APOTEKER" || role === "ASISTEN_APOTEKER" || role === "ADMIN"; // Penjualan: semua role kecuali tidak ada yang dikecualikan lagi
  const canRestock = role === "APOTEKER" || role === "ASISTEN_APOTEKER"; // Restock: Admin tidak punya akses
  const canManageObat = role === "APOTEKER"; // Input Obat: hanya Apoteker
  const canSeeLaporan = role === "APOTEKER" || role === "ADMIN"; // Laporan: Asisten tidak punya akses

  const actions = [
    { href: "/input-data?tab=penjualan", label: "Transaksi Baru", icon: ShoppingCart, show: canSell, color: "bg-emerald-600 hover:bg-emerald-700" },
    { href: "/input-data?tab=restock", label: "Restock Obat", icon: PackagePlus, show: canRestock, color: "bg-blue-600 hover:bg-blue-700" },
    { href: "/obat?add=1", label: "Tambah Obat", icon: PlusCircle, show: canManageObat, color: "bg-violet-600 hover:bg-violet-700" },
    { href: "/laporan", label: "Lihat Laporan", icon: FileBarChart, show: canSeeLaporan, color: "bg-slate-700 hover:bg-slate-800" },
  ].filter((a) => a.show);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`${a.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-colors`}
        >
          <a.icon className="h-6 w-6" />
          <span className="text-sm font-medium">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
