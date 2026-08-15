import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineSchema } from "@/types";

const CAN_MANAGE = ["PSA", "APOTEKER"]; // PSA & Apoteker yang boleh kelola data obat/restock

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    include: {
      supplier: true,
      manufacturer: true,
      batches: { orderBy: { expiredDate: "asc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  const data = medicines.map((m) => ({
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

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk menghapus data obat" }, { status: 403 });
  }

  try {
    const result = await prisma.medicine.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETE",
        entity: "Medicine",
        entityId: null,
        detail: { bulk: true, count: result.count },
      },
    });

    return NextResponse.json({ data: { count: result.count } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal menghapus semua data obat" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk menambah obat" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = medicineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await (async () => {
        const existing = await tx.supplier.findFirst({ where: { name: v.supplierName } });
        return existing ?? tx.supplier.create({ data: { name: v.supplierName } });
      })();

      const manufacturer = await (async () => {
        const existing = await tx.manufacturer.findFirst({ where: { name: v.manufacturerName } });
        return existing ?? tx.manufacturer.create({ data: { name: v.manufacturerName } });
      })();

      const stokAwal = v.stokAwalBox * v.isiPerBox;

      const medicine = await tx.medicine.create({
        data: {
          name: v.name,
          type: v.type,
          supplierId: supplier.id,
          manufacturerId: manufacturer.id,
          hargaBeli: v.hargaBeli,
          hargaJualMedis1: v.hargaJualMedis1,
          hargaJualMedis2: v.hargaJualMedis2,
          hargaJualMedis3: v.hargaJualMedis3,
          hargaJualUmum: v.hargaJualUmum,
          stok: stokAwal,
          isiPerBox: v.isiPerBox,
          minStok: v.minStok,
        },
      });

      if (stokAwal > 0) {
        const purchase = await tx.purchase.create({
          data: {
            medicineId: medicine.id,
            supplierId: supplier.id,
            noFaktur: v.noFaktur,
            jumlahBox: v.stokAwalBox,
            isiPerBox: v.isiPerBox,
            totalMasuk: stokAwal,
            expiredBatch: new Date(v.expiredDate),
            hutang: v.hutangKePbf && v.hutangKePbf > 0 ? v.hutangKePbf : null,
            jatuhTempo: v.jatuhTempoHutang ? new Date(v.jatuhTempoHutang) : null,
            petugasId: (session.user as any).id,
          },
        });

        await tx.medicineBatch.create({
          data: {
            medicineId: medicine.id,
            noFaktur: v.noFaktur,
            qtyMasuk: stokAwal,
            qtySisa: stokAwal,
            expiredDate: new Date(v.expiredDate),
            purchaseId: purchase.id,
          },
        });

        await tx.stockLog.create({
          data: {
            medicineId: medicine.id,
            type: "MASUK",
            qty: stokAwal,
            stokSebelum: 0,
            stokSesudah: stokAwal,
            keterangan: `Stok awal - faktur ${v.noFaktur}`,
          },
        });

        if (v.hutangKePbf && v.hutangKePbf > 0) {
          await tx.debt.create({
            data: {
              purchaseId: purchase.id,
              supplierId: supplier.id,
              totalHutang: v.hutangKePbf,
              sudahDibayar: 0,
              sisaHutang: v.hutangKePbf,
              jatuhTempo: v.jatuhTempoHutang ? new Date(v.jatuhTempoHutang) : new Date(),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "CREATE",
          entity: "Medicine",
          entityId: medicine.id,
          detail: { name: medicine.name },
        },
      });

      return medicine;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal menyimpan data obat" }, { status: 400 });
  }
}
