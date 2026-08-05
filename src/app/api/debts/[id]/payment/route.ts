import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CAN_MANAGE = ["APOTEKER", "ADMIN"]; // Asisten tidak punya akses Kelola Utang/Faktur

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Jumlah pembayaran harus lebih dari 0"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk mencatat pembayaran" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt) return NextResponse.json({ error: "Data hutang tidak ditemukan" }, { status: 404 });

    const amount = parsed.data.amount;
    if (amount > Number(debt.sisaHutang)) {
      return NextResponse.json({ error: "Jumlah pembayaran melebihi sisa hutang" }, { status: 400 });
    }

    const sudahDibayar = Number(debt.sudahDibayar) + amount;
    const sisaHutang = Number(debt.totalHutang) - sudahDibayar;

    const updated = await prisma.debt.update({
      where: { id: params.id },
      data: {
        sudahDibayar,
        sisaHutang,
        status: sisaHutang <= 0 ? "LUNAS" : debt.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE",
        entity: "Debt",
        entityId: updated.id,
        detail: { amount, sisaHutang },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal mencatat pembayaran" }, { status: 400 });
  }
}
