import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UtangFakturView } from "@/components/utang/utang-view";

async function getDebts() {
  try {
    const debts = await prisma.debt.findMany({
      orderBy: { jatuhTempo: "asc" },
      include: { supplier: true, purchase: { include: { medicine: true } } },
    });
    return debts.map((d) => ({
      id: d.id,
      noFaktur: d.purchase.noFaktur,
      namaPbf: d.supplier.name,
      namaObat: d.purchase.medicine.name,
      totalHutang: Number(d.totalHutang),
      sudahDibayar: Number(d.sudahDibayar),
      sisaHutang: Number(d.sisaHutang),
      jatuhTempo: d.jatuhTempo.toISOString(),
      status: d.status,
    }));
  } catch {
    return [];
  }
}

export default async function UtangFakturPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const canEdit = ["PSA", "APOTEKER", "ADMIN"].includes(role); // Asisten tidak dapat mengakses halaman ini

  const debts = await getDebts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Kelola Utang & Faktur</h1>
        <p className="text-sm text-slate-500">Kelola pembayaran hutang ke PBF</p>
      </div>
      <UtangFakturView initialData={debts} canEdit={canEdit} />
    </div>
  );
}
