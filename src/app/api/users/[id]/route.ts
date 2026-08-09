import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUpdateSchema } from "@/types";
import bcrypt from "bcryptjs";

const CAN_MANAGE = ["APOTEKER"];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk mengelola akun" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, newPassword } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }

    const data: { name: string; passwordHash?: string } = { name };
    if (newPassword) {
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, username: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE",
        entity: "User",
        entityId: updated.id,
        detail: { name, passwordChanged: !!newPassword },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memperbarui akun" }, { status: 400 });
  }
}
