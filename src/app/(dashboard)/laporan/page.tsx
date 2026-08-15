import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LaporanView } from "@/components/laporan/laporan-view";

async function getSalesReport() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      include: { kasir: true, details: true },
    });
    return sales.map((s) => ({
      id: s.id,
      noTransaksi: s.noTransaksi,
      tanggal: s.createdAt.toISOString(),
      total: Number(s.totalHarga),
      totalItem: s.totalItem,
      kasir: s.kasir.name,
    }));
  } catch {
    return [];
  }
}

export default async function LaporanPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const fullAccess = role === "PSA" || role === "APOTEKER" || role === "ADMIN"; // Asisten = terbatas

  const sales = await getSalesReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Laporan Penjualan</h1>
        <p className="text-sm text-slate-500">
          {fullAccess ? "Akses penuh terhadap laporan penjualan" : "Akses laporan terbatas untuk Asisten Apoteker"}
        </p>
      </div>
      <LaporanView initialData={sales} fullAccess={fullAccess} />
    </div>
  );
}
