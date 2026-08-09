import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateEOQ, getEoqStatus, DEFAULT_ORDERING_COST, DEFAULT_HOLDING_COST_PERCENT,
} from "@/lib/eoq";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderingCost = Number(req.nextUrl.searchParams.get("orderingCost")) || DEFAULT_ORDERING_COST;
  const holdingCostPercent = Number(req.nextUrl.searchParams.get("holdingCostPercent")) || DEFAULT_HOLDING_COST_PERCENT;

  try {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stok: true, minStok: true, hargaBeli: true },
    });

    // Total qty terjual per obat dalam 365 hari terakhir
    const salesAgg = await prisma.saleDetail.groupBy({
      by: ["medicineId"],
      where: { sale: { createdAt: { gte: oneYearAgo } } },
      _sum: { qty: true },
    });
    const qtyMap = new Map(salesAgg.map((s) => [s.medicineId, s._sum.qty ?? 0]));

    // Cari transaksi penjualan paling lama untuk menentukan berapa hari data historis tersedia
    // (dipakai untuk menyetahunkan/annualize permintaan bila data belum genap 1 tahun)
    const earliestSale = await prisma.sale.findFirst({
      where: { createdAt: { gte: oneYearAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const daysTracked = earliestSale
      ? Math.max(1, Math.min(365, Math.ceil((now.getTime() - earliestSale.createdAt.getTime()) / 86400000)))
      : 0;

    const result = medicines.map((m) => {
      const totalQty = qtyMap.get(m.id) ?? 0;
      const annualDemand = daysTracked > 0 ? (totalQty / daysTracked) * 365 : 0;
      const holdingCostPerUnit = Number(m.hargaBeli) * (holdingCostPercent / 100);
      const eoq = calculateEOQ(annualDemand, orderingCost, holdingCostPerUnit);
      const status = getEoqStatus(annualDemand, m.stok, eoq);
      const saranPembelian = Math.max(0, Math.round(eoq - m.stok));

      return {
        id: m.id,
        name: m.name,
        stok: m.stok,
        minStok: m.minStok,
        annualDemand: Math.round(annualDemand),
        eoq: Math.round(eoq),
        saranPembelian,
        status,
      };
    });

    // Urutkan: yang paling butuh restock di atas
    result.sort((a, b) => b.saranPembelian - a.saranPembelian);

    return NextResponse.json({
      data: result,
      params: { orderingCost, holdingCostPercent, daysTracked },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal menghitung EOQ" }, { status: 500 });
  }
}
