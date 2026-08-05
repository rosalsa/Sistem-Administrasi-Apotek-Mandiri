import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num || 0);
}

export function formatTanggal(date: Date | string, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function generateNoTransaksi() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `TRX-${y}${m}${d}-${rand}`;
}

// Status stok obat berdasarkan jumlah stok vs batas minimum
export function getStockStatus(stok: number, minStok: number) {
  if (stok <= 0) return { label: "Habis", color: "red" } as const;
  if (stok <= minStok) return { label: "Menipis", color: "yellow" } as const;
  return { label: "Aman", color: "green" } as const;
}

// Status expired berdasarkan tanggal (H-90 = akan expired)
export function getExpiredStatus(expiredDate: Date | string) {
  const exp = typeof expiredDate === "string" ? new Date(expiredDate) : expiredDate;
  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Sudah Expired", color: "red" } as const;
  if (diffDays <= 90) return { label: "Akan Expired", color: "yellow" } as const;
  return { label: "Aman", color: "green" } as const;
}
