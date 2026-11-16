import { RiwayatPenjualanTable } from "@/components/riwayat/riwayat-table";

export default function RiwayatPenjualanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Riwayat Penjualan</h1>
        <p className="text-sm text-slate-500">Semua transaksi penjualan yang tercatat</p>
      </div>
      <RiwayatPenjualanTable />
    </div>
  );
}
