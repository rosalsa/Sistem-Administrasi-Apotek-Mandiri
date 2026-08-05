import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Akses Ditolak</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi Apoteker jika Anda merasa ini adalah kesalahan.
        </p>
        <Link href="/dashboard" className="inline-block mt-2 text-sm font-medium text-emerald-600 hover:underline">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
