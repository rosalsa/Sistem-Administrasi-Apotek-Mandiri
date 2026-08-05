"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Pill,
  ClipboardList,
  History,
  Boxes,
  Receipt,
  BarChart3,
  KeyRound,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Array<"APOTEKER" | "ASISTEN_APOTEKER" | "ADMIN">;
};

const MENU: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"] },
  { href: "/obat", label: "Data Obat", icon: Pill, roles: ["APOTEKER"] },
  { href: "/input-data", label: "Input Data", icon: ClipboardList, roles: ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"] },
  { href: "/riwayat-penjualan", label: "Riwayat Penjualan", icon: History, roles: ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"] },
  { href: "/monitoring-stok", label: "Monitoring Stok", icon: Boxes, roles: ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"] },
  { href: "/utang-faktur", label: "Kelola Utang/Faktur", icon: Receipt, roles: ["APOTEKER", "ADMIN"] },
  { href: "/laporan", label: "Laporan Penjualan", icon: BarChart3, roles: ["APOTEKER", "ADMIN"] },
  { href: "/ganti-password", label: "Ganti Password", icon: KeyRound, roles: ["APOTEKER"] },
];

export function Sidebar({ role }: { role: "APOTEKER" | "ASISTEN_APOTEKER" | "ADMIN" }) {
  const pathname = usePathname();
  const visibleMenu = MENU.filter((item) => item.roles.includes(role));
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-white">
      <div className="flex items-center gap-2 px-6 h-16 border-b">
        <img src="/logo.svg" alt="Logo Apotek Mandiri" className="h-8 w-8 rounded-lg object-contain" />
        <span className="font-semibold text-slate-800">Apotek Mandiri</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleMenu.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <button
          onClick={() => setConfirmLogout(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          title="Konfirmasi Logout"
          message="Apakah Anda yakin ingin keluar dari sistem?"
          confirmLabel="Ya, Logout"
          variant="danger"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => signOut({ callbackUrl: "/login" })}
        />
      )}
    </aside>
  );
}
