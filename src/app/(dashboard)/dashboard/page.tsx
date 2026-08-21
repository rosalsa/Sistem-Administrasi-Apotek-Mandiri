import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { DashboardChart } from "@/components/dashboard-chart";
import { QuickActions } from "@/components/quick-actions";
import {
  Wallet, TrendingUp, Receipt, Pill, Boxes, AlertTriangle, Clock,
} from "lucide-react";
import Link from "next/link";

// Query-query dijalankan paralel di server component. Ganti dengan query
// prisma sungguhan sesuai skema di prisma/schema.prisma
async function getDashboardData() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const in90Days = new Date();
  in90Days.setDate(in90Days.getDate() + 90);

  const [
    pendapatanHariIni,
    pendapatanBulanIni,
    totalTransaksiHariIni,
    totalJenisObat,
    stokAgg,
    obatHampirHabis,
    obatHampirExpired,
    transaksiTerbaru,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { totalHarga: true }, where: { createdAt: { gte: startOfDay } } }),
    prisma.sale.aggregate({ _sum: { totalHarga: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.sale.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.medicine.aggregate({ _sum: { stok: true } }),
    prisma.medicine.count({ where: { stok: { lte: prisma.medicine.fields.minStok as any } } }).catch(() => 0),
    prisma.medicineBatch.count({ where: { expiredDate: { lte: in90Days }, qtySisa: { gt: 0 } } }),
    prisma.sale.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { kasir: true, details: { include: { medicine: true }, take: 1 } },
    }),
  ]);

  return {
    pendapatanHariIni: Number(pendapatanHariIni._sum.totalHarga ?? 0),
    pendapatanBulanIni: Number(pendapatanBulanIni._sum.totalHarga ?? 0),
    totalTransaksiHariIni,
    totalJenisObat,
    totalStok: stokAgg._sum.stok ?? 0,
    obatHampirHabis,
    obatHampirExpired,
    transaksiTerbaru,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  let data;
  try {
    data = await getDashboardData();
  } catch {
    // fallback ketika database belum tersedia (mis. saat development awal)
    data = {
      pendapatanHariIni: 0,
      pendapatanBulanIni: 0,
      totalTransaksiHariIni: 0,
      totalJenisObat: 0,
      totalStok: 0,
      obatHampirHabis: 0,
      obatHampirExpired: 0,
      transaksiTerbaru: [] as any[],
    };
  }

  const cards = [
    { label: "Pendapatan Hari Ini", value: formatRupiah(data.pendapatanHariIni), icon: Wallet, color: "bg-brand-50 text-brand-600" },
    { label: "Pendapatan Bulan Ini", value: formatRupiah(data.pendapatanBulanIni), icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
    { label: "Total Transaksi Hari Ini", value: data.totalTransaksiHariIni.toString(), icon: Receipt, color: "bg-violet-50 text-violet-600" },
    { label: "Total Jenis Obat", value: data.totalJenisObat.toString(), icon: Pill, color: "bg-cyan-50 text-cyan-600" },
    { label: "Total Stok", value: data.totalStok.toString(), icon: Boxes, color: "bg-slate-100 text-slate-600" },
    { label: "Obat Hampir Habis", value: data.obatHampirHabis.toString(), icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
    { label: "Obat Hampir Expired", value: data.obatHampirExpired.toString(), icon: Clock, color: "bg-red-50 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Ringkasan operasional apotek hari ini</p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border p-4 flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action */}
      <QuickActions role={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistik Pendapatan */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <DashboardChart />
        </div>

        {/* Perlu Perhatian */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Perlu Perhatian</h3>
          <div className="space-y-2">
            <Link href="/monitoring-stok?filter=habis" className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2.5 hover:bg-red-100 transition-colors">
              <span className="text-sm text-red-700">Stok Habis</span>
              <span className="text-xs font-semibold bg-red-600 text-white rounded-full px-2 py-0.5">Cek</span>
            </Link>
            <Link href="/monitoring-stok?filter=menipis" className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 hover:bg-amber-100 transition-colors">
              <span className="text-sm text-amber-700">Stok Menipis</span>
              <span className="text-xs font-semibold bg-amber-500 text-white rounded-full px-2 py-0.5">Cek</span>
            </Link>
            <Link href="/monitoring-stok?filter=akan-expired" className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 hover:bg-amber-100 transition-colors">
              <span className="text-sm text-amber-700">Obat Akan Expired</span>
              <span className="text-xs font-semibold bg-amber-500 text-white rounded-full px-2 py-0.5">{data.obatHampirExpired}</span>
            </Link>
            <Link href="/monitoring-stok?filter=expired" className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2.5 hover:bg-red-100 transition-colors">
              <span className="text-sm text-red-700">Obat Sudah Expired</span>
              <span className="text-xs font-semibold bg-red-600 text-white rounded-full px-2 py-0.5">Cek</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Transaksi Terbaru */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Transaksi Terbaru</h3>
          <Link href="/riwayat-penjualan" className="text-xs font-medium text-brand-600 hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">No Transaksi</th>
                <th className="text-left px-4 py-2.5">Tanggal</th>
                <th className="text-left px-4 py-2.5">Nama Obat</th>
                <th className="text-right px-4 py-2.5">Total</th>
                <th className="text-left px-4 py-2.5">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.transaksiTerbaru.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Belum ada transaksi
                  </td>
                </tr>
              ) : (
                data.transaksiTerbaru.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{t.noTransaksi}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatTanggal(t.createdAt, true)}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {t.details?.[0]?.medicine?.name}
                      {t.details?.length > 1 ? ` +${t.details.length - 1} lainnya` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatRupiah(Number(t.totalHarga))}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.kasir?.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
