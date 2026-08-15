import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineEditSchema } from "@/types";

const CAN_MANAGE = ["PSA", "APOTEKER"]; // PSA & Apoteker yang boleh kelola data obat/restock

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk mengubah obat" }, { status: 403 });
  }

  const body = await req.json();
  // Skema edit: tidak mewajibkan faktur / stok awal / tanggal expired (itu urusan restock)
  const partialSchema = medicineEditSchema.partial();
  const parsed = partialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data as any;

  try {
    const existing = await prisma.medicine.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Obat tidak ditemukan" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      let supplierId = existing.supplierId;
      if (v.supplierName) {
        const supplier =
          (await tx.supplier.findFirst({ where: { name: v.supplierName } })) ??
          (await tx.supplier.create({ data: { name: v.supplierName } }));
        supplierId = supplier.id;
      }

      let manufacturerId = existing.manufacturerId;
      if (v.manufacturerName) {
        const manufacturer =
          (await tx.manufacturer.findFirst({ where: { name: v.manufacturerName } })) ??
          (await tx.manufacturer.create({ data: { name: v.manufacturerName } }));
        manufacturerId = manufacturer.id;
      }

      const updated = await tx.medicine.update({
        where: { id: params.id },
        data: {
          ...(v.name && { name: v.name }),
          ...(v.type && { type: v.type }),
          ...(v.hargaBeli !== undefined && { hargaBeli: v.hargaBeli }),
          ...(v.hargaJualMedis1 !== undefined && { hargaJualMedis1: v.hargaJualMedis1 }),
          ...(v.hargaJualMedis2 !== undefined && { hargaJualMedis2: v.hargaJualMedis2 }),
          ...(v.hargaJualMedis3 !== undefined && { hargaJualMedis3: v.hargaJualMedis3 }),
          ...(v.hargaJualUmum !== undefined && { hargaJualUmum: v.hargaJualUmum }),
          ...(v.minStok !== undefined && { minStok: v.minStok }),
          supplierId,
          manufacturerId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "UPDATE",
          entity: "Medicine",
          entityId: updated.id,
          detail: { name: updated.name },
        },
      });

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memperbarui data obat" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk menghapus obat" }, { status: 403 });
  }

  try {
    const medicine = await prisma.medicine.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETE",
        entity: "Medicine",
        entityId: medicine.id,
        detail: { name: medicine.name },
      },
    });

    return NextResponse.json({ data: { id: medicine.id } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal menghapus data obat" }, { status: 400 });
  }
}
