import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = req.nextUrl.searchParams.get("range") === "yearly" ? "yearly" : "monthly";
  const now = new Date();

  try {
    if (range === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = now.getDate(); // hanya sampai hari ini, biar tidak menampilkan hari yang belum terjadi

      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: { totalHarga: true, createdAt: true },
      });

      const buckets = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), total: 0 }));
      for (const s of sales) {
        const day = s.createdAt.getDate();
        if (day >= 1 && day <= daysInMonth) {
          buckets[day - 1].total += Number(s.totalHarga);
        }
      }

      return NextResponse.json({ data: buckets });
    }

    // yearly
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfYear } },
      select: { totalHarga: true, createdAt: true },
    });

    const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthsToShow = now.getMonth() + 1; // hanya sampai bulan berjalan
    const buckets = Array.from({ length: monthsToShow }, (_, i) => ({ label: MONTH_LABEL[i], total: 0 }));
    for (const s of sales) {
      const month = s.createdAt.getMonth();
      if (month < monthsToShow) {
        buckets[month].total += Number(s.totalHarga);
      }
    }

    return NextResponse.json({ data: buckets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat statistik" }, { status: 500 });
  }
}
