import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Riwayat penjualan dengan filter rentang tanggal di sisi server + pagination.
// Tanggal dari/sampai dikirim sebagai "YYYY-MM-DD" dan ditafsirkan dalam WIB (UTC+7),
// supaya batas hari sesuai dengan yang dilihat pengguna di Indonesia.
const WIB = "+07:00";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50") || 50));

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Parameter from dan to wajib berformat YYYY-MM-DD" }, { status: 400 });
  }

  const gte = new Date(`${from}T00:00:00.000${WIB}`);
  const lte = new Date(`${to}T23:59:59.999${WIB}`);
  if (isNaN(gte.getTime()) || isNaN(lte.getTime()) || gte > lte) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid" }, { status: 400 });
  }

  const where = { createdAt: { gte, lte } };

  try {
    const [sales, total, sum] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { kasir: true, details: { include: { medicine: true } } },
      }),
      prisma.sale.count({ where }),
      prisma.sale.aggregate({ where, _sum: { totalHarga: true } }),
    ]);

    return NextResponse.json({
      data: sales.map((s) => ({
        id: s.id,
        noTransaksi: s.noTransaksi,
        tanggal: s.createdAt.toISOString(),
        total: Number(s.totalHarga),
        kasir: s.kasir.name,
        items: s.details.map((d) => ({
          nama: d.medicine.name,
          qty: d.qty,
          harga: Number(d.hargaSatuan),
          subtotal: Number(d.subtotal),
        })),
      })),
      total,
      totalPendapatan: Number(sum._sum.totalHarga ?? 0),
      page,
      pageSize,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memuat riwayat penjualan" }, { status: 500 });
  }
}
