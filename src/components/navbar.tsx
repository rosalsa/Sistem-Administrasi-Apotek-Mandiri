"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type { Session } from "next-auth";

const ROLE_LABEL: Record<string, string> = {
  APOTEKER: "Apoteker",
  ASISTEN_APOTEKER: "Asisten Apoteker",
  ADMIN: "Admin",
};

export function Navbar({ user, role }: { user: Session["user"]; role: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <button
        className="md:hidden p-2 rounded-lg hover:bg-slate-100"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block">
        <p className="text-sm text-slate-500">Selamat datang kembali,</p>
        <p className="font-semibold text-slate-800">{user?.name}</p>
      </div>
    </header>
  );
}
