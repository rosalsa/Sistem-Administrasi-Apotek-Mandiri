import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountManager } from "@/components/akun/account-manager";
import { ShieldAlert } from "lucide-react";

export default async function GantiPasswordPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "PSA") {
    return (
      <div className="max-w-md">
        <div className="bg-white rounded-xl border p-6 flex items-start gap-3 text-slate-600">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm">Hanya akun PSA (Pemilik Sarana Apotek) yang dapat mengelola nama & password seluruh akun.</p>
        </div>
      </div>
    );
  }

  const accounts = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, username: true, role: true },
    orderBy: { role: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ganti Password & Nama Akun</h1>
        <p className="text-sm text-slate-500">
          Kelola nama tampilan dan password untuk masing-masing akun (PSA, Apoteker, Asisten Apoteker, Admin) secara terpisah
        </p>
      </div>

      <AccountManager accounts={accounts as any} />
    </div>
  );
}
