import { prisma } from "@/lib/prisma";
import { MonitoringStokView } from "@/components/monitoring/monitoring-view";

async function getData() {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: { batches: { orderBy: { expiredDate: "asc" }, take: 1 } },
    });
    return medicines.map((m) => ({
      id: m.id,
      name: m.name,
      stok: m.stok,
      minStok: m.minStok,
      expiredTerdekat: m.batches[0]?.expiredDate?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function MonitoringStokPage() {
  const medicines = await getData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Monitoring Stok</h1>
        <p className="text-sm text-slate-500">Pantau kondisi stok dan tanggal expired obat</p>
      </div>
      <MonitoringStokView medicines={medicines} />
    </div>
  );
}
