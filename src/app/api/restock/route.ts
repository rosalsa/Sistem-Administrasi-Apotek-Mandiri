import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restockSchema } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["PSA", "APOTEKER", "ASISTEN_APOTEKER"].includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk restock" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = restockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { medicineId, jumlahBox, isiPerBox, expiredBatch, noFaktur, hutangKePbf, jatuhTempoHutang } = parsed.data;
  const totalMasuk = jumlahBox * isiPerBox;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
      if (!medicine) throw new Error("Obat tidak ditemukan");

      const purchase = await tx.purchase.create({
        data: {
          medicineId,
          supplierId: medicine.supplierId,
          noFaktur,
          jumlahBox,
          isiPerBox,
          totalMasuk,
          expiredBatch: new Date(expiredBatch),
          hutang: hutangKePbf && hutangKePbf > 0 ? hutangKePbf : null,
          jatuhTempo: jatuhTempoHutang ? new Date(jatuhTempoHutang) : null,
          petugasId: (session.user as any).id,
        },
      });

      if (hutangKePbf && hutangKePbf > 0 && medicine.supplierId) {
        await tx.debt.create({
          data: {
            purchaseId: purchase.id,
            supplierId: medicine.supplierId,
            totalHutang: hutangKePbf,
            sudahDibayar: 0,
            sisaHutang: hutangKePbf,
            jatuhTempo: jatuhTempoHutang ? new Date(jatuhTempoHutang) : new Date(),
          },
        });
      }

      await tx.medicineBatch.create({
        data: {
          medicineId,
          noFaktur,
          qtyMasuk: totalMasuk,
          qtySisa: totalMasuk,
          expiredDate: new Date(expiredBatch),
          purchaseId: purchase.id,
        },
      });

      const updated = await tx.medicine.update({
        where: { id: medicineId },
        data: { stok: { increment: totalMasuk } },
      });

      await tx.stockLog.create({
        data: {
          medicineId,
          type: "MASUK",
          qty: totalMasuk,
          stokSebelum: updated.stok - totalMasuk,
          stokSesudah: updated.stok,
          keterangan: `Restock faktur ${noFaktur}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "CREATE",
          entity: "Purchase",
          entityId: purchase.id,
          detail: { noFaktur, totalMasuk },
        },
      });

      return purchase;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memproses restock" }, { status: 400 });
  }
}

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { medicine: true, petugas: true },
  });
  return NextResponse.json({ data: purchases });
}
