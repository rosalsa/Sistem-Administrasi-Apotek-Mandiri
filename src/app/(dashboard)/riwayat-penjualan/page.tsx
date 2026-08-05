import { prisma } from "@/lib/prisma";
import { RiwayatPenjualanTable } from "@/components/riwayat/riwayat-table";

async function getSales() {
  try {
    const sales = await prisma.sale.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { kasir: true, details: { include: { medicine: true } } },
    });
    return sales.map((s) => ({
      id: s.id,
      noTransaksi: s.noTransaksi,
      tanggal: s.createdAt.toISOString(),
      total: Number(s.totalHarga),
      kasir: s.kasir.name,
      items: s.details.map((d) => ({
        nama: d.medicine.name, qty: d.qty, harga: Number(d.hargaSatuan), subtotal: Number(d.subtotal),
      })),
    }));
  } catch {
    return [];
  }
}

export default async function RiwayatPenjualanPage() {
  const sales = await getSales();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Riwayat Penjualan</h1>
        <p className="text-sm text-slate-500">Semua transaksi penjualan yang tercatat</p>
      </div>
      <RiwayatPenjualanTable initialData={sales} />
    </div>
  );
}
