"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordValues } from "@/types";
import { Loader2, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function GantiPasswordPage() {
  const [loading, setLoading] = useState(false);
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    setLoading(true);
    try {
      // const res = await fetch("/api/auth/change-password", { method: "POST", body: JSON.stringify(values) });
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Password berhasil diperbarui");
      reset();
    } catch {
      toast.error("Password lama salah atau terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ganti Password</h1>
        <p className="text-sm text-slate-500">Perbarui password akun Anda secara berkala</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 mb-2">
          <KeyRound className="h-5 w-5" />
          <span className="text-sm font-medium">Keamanan Akun</span>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password Lama</label>
          <input type="password" {...register("oldPassword")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          {errors.oldPassword && <p className="text-xs text-red-500">{errors.oldPassword.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password Baru</label>
          <input type="password" {...register("newPassword")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
          <p className="text-xs text-slate-400">Minimal 8 karakter</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
          <input type="password" {...register("confirmPassword")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Perubahan
        </button>
      </form>
    </div>
  );
}
