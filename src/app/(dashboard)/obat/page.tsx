import { prisma } from "@/lib/prisma";
import { ObatTable } from "@/components/obat/obat-table";

async function getMedicines() {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        supplier: true,
        manufacturer: true,
        batches: { orderBy: { expiredDate: "asc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    });

    return medicines.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      stok: m.stok,
      minStok: m.minStok,
      hargaBeli: Number(m.hargaBeli),
      hargaJualMedis1: Number(m.hargaJualMedis1),
      hargaJualMedis2: Number(m.hargaJualMedis2),
      hargaJualMedis3: Number(m.hargaJualMedis3),
      hargaJualUmum: Number(m.hargaJualUmum),
      expiredTerdekat: m.batches[0]?.expiredDate?.toISOString() ?? null,
      supplierName: m.supplier?.name ?? "-",
      manufacturerName: m.manufacturer?.name ?? "-",
    }));
  } catch {
    return [];
  }
}

export default async function ObatPage() {
  const medicines = await getMedicines();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Obat</h1>
          <p className="text-sm text-slate-500">Kelola data master obat, harga, dan stok</p>
        </div>
      </div>

      <ObatTable initialData={medicines} />
    </div>
  );
}
