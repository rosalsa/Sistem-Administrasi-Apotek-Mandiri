import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Hanya Apoteker (pemilik/pengelola apotek) yang boleh mengelola nama & password ketiga akun
const CAN_MANAGE = ["PSA"]; // hanya PSA yang boleh kelola nama/password semua akun

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk mengelola akun" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, username: true, role: true },
    orderBy: { role: "asc" },
  });

  return NextResponse.json({ data: users });
}
