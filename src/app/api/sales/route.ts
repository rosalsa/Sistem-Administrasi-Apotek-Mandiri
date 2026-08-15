import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNoTransaksi } from "@/lib/utils";
import { z } from "zod";

const saleItemSchema = z.object({
  medicineId: z.string(),
  hargaType: z.enum(["MEDIS", "UMUM"]),
  hargaSatuan: z.number().positive(),
  qty: z.number().int().positive(),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Keranjang tidak boleh kosong"),
  bayar: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["PSA", "APOTEKER", "ASISTEN_APOTEKER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk membuat transaksi" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, bayar } = parsed.data;
  const totalHarga = items.reduce((sum, i) => sum + i.qty * i.hargaSatuan, 0);
  const totalItem = items.reduce((sum, i) => sum + i.qty, 0);

  if (bayar < totalHarga) {
    return NextResponse.json({ error: "Jumlah bayar kurang dari total harga" }, { status: 400 });
  }

  try {
    // Transaksi atomik: buat sale + kurangi stok + catat stock log + audit log
    const result = await prisma.$transaction(async (tx) => {
      // Validasi stok sebelum memproses
      for (const item of items) {
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine || medicine.stok < item.qty) {
          throw new Error(`Stok "${medicine?.name ?? item.medicineId}" tidak mencukupi`);
        }
      }

      const sale = await tx.sale.create({
        data: {
          noTransaksi: generateNoTransaksi(),
          kasirId: (session.user as any).id,
          totalItem,
          totalHarga,
          bayar,
          kembalian: bayar - totalHarga,
          details: {
            create: items.map((i) => ({
              medicineId: i.medicineId,
              hargaType: i.hargaType,
              qty: i.qty,
              hargaSatuan: i.hargaSatuan,
              subtotal: i.qty * i.hargaSatuan,
            })),
          },
        },
        include: { details: true },
      });

      // Kurangi stok & catat stock log per item (FEFO bisa diterapkan di sini
      // dengan mengambil MedicineBatch terdekat expired terlebih dahulu)
      for (const item of items) {
        const medicine = await tx.medicine.update({
          where: { id: item.medicineId },
          data: { stok: { decrement: item.qty } },
        });

        await tx.stockLog.create({
          data: {
            medicineId: item.medicineId,
            type: "KELUAR",
            qty: item.qty,
            stokSebelum: medicine.stok + item.qty,
            stokSesudah: medicine.stok,
            keterangan: `Penjualan ${sale.noTransaksi}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "TRANSACTION",
          entity: "Sale",
          entityId: sale.id,
          detail: { noTransaksi: sale.noTransaksi, totalHarga },
        },
      });

      return sale;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal memproses transaksi" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "10");

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { kasir: true, details: { include: { medicine: true } } },
    }),
    prisma.sale.count(),
  ]);

  return NextResponse.json({ data: sales, total, page, pageSize });
}
