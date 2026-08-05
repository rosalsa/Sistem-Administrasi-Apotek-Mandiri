import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InputDataView } from "@/components/input-data/input-data-view";

async function getData() {
  try {
    const [allMedicines, riwayat] = await Promise.all([
      prisma.medicine.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, isiPerBox: true, stok: true,
          hargaJualMedis1: true, hargaJualMedis2: true, hargaJualMedis3: true, hargaJualUmum: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.purchase.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { medicine: true, petugas: true },
      }),
    ]);

    const restockMedicines = allMedicines.map((m) => ({
      id: m.id, name: m.name, isiPerBox: m.isiPerBox, stok: m.stok,
    }));

    // Hanya obat dengan stok > 0 yang bisa dijual — mencegah input penjualan saat barang habis
    const saleMedicines = allMedicines
      .filter((m) => m.stok > 0)
      .map((m) => ({
        id: m.id,
        name: m.name,
        stok: m.stok,
        hargaMedis1: Number(m.hargaJualMedis1),
        hargaMedis2: Number(m.hargaJualMedis2),
        hargaMedis3: Number(m.hargaJualMedis3),
        hargaUmum: Number(m.hargaJualUmum),
      }));

    return {
      restockMedicines,
      saleMedicines,
      riwayat: riwayat.map((r) => ({
        id: r.id,
        tanggal: r.createdAt.toISOString(),
        namaObat: r.medicine.name,
        jumlah: r.totalMasuk,
        expired: r.expiredBatch.toISOString(),
        petugas: r.petugas.name,
      })),
    };
  } catch {
    return { restockMedicines: [], saleMedicines: [], riwayat: [] };
  }
}

export default async function InputDataPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as "APOTEKER" | "ASISTEN_APOTEKER" | "ADMIN";

  const canRestock = role === "APOTEKER" || role === "ASISTEN_APOTEKER";
  const canSell = role === "APOTEKER" || role === "ASISTEN_APOTEKER" || role === "ADMIN";

  const { restockMedicines, saleMedicines, riwayat } = await getData();

  return (
    <InputDataView
      saleMedicines={canSell ? saleMedicines : []}
      restockMedicines={canRestock ? restockMedicines : []}
      initialRiwayat={riwayat}
      canRestock={canRestock}
      canSell={canSell}
    />
  );
}
