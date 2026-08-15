"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountUpdateSchema, type AccountUpdateValues } from "@/types";
import { Loader2, KeyRound, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AccountItem = { id: string; name: string; username: string; role: "PSA" | "APOTEKER" | "ASISTEN_APOTEKER" | "ADMIN" };

const ROLE_LABEL: Record<string, string> = {
  PSA: "PSA (Pemilik Sarana Apotek)",
  APOTEKER: "Apoteker",
  ASISTEN_APOTEKER: "Asisten Apoteker",
  ADMIN: "Admin",
};

export function AccountManager({ accounts }: { accounts: AccountItem[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {accounts.map((acc) => (
        <AccountCard key={acc.id} account={acc} />
      ))}
    </div>
  );
}

function AccountCard({ account }: { account: AccountItem }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountUpdateValues>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: { name: account.name, newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: AccountUpdateValues) {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          newPassword: values.newPassword || undefined,
          confirmPassword: values.confirmPassword || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Gagal memperbarui akun");
      }
      toast.success(`Akun ${ROLE_LABEL[account.role]} berhasil diperbarui`);
      reset({ name: values.name, newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memperbarui akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center gap-2 text-emerald-600 mb-1">
        <KeyRound className="h-5 w-5" />
        <span className="text-sm font-medium">{ROLE_LABEL[account.role]}</span>
      </div>
      <p className="text-xs text-slate-400 -mt-2">Username: {account.username}</p>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <UserIcon className="h-3.5 w-3.5" /> Nama Tampilan
        </label>
        <input
          {...register("name")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1 pt-2 border-t">
        <label className="text-sm font-medium text-slate-700">Password Baru</label>
        <input
          type="password"
          {...register("newPassword")}
          placeholder="Kosongkan jika tidak ingin mengubah"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
        <p className="text-xs text-slate-400">Minimal 8 karakter, biarkan kosong jika tidak ingin ganti password</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
        <input
          type="password"
          {...register("confirmPassword")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
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
  );
}
