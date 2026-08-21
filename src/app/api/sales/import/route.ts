import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Semua role yang boleh input penjualan juga boleh upload riwayat untuk uji coba EOQ
const CAN_IMPORT = ["PSA", "APOTEKER", "ASISTEN_APOTEKER", "ADMIN"];

// Kolom yang diharapkan di file Excel/CSV (header baris pertama, tidak case sensitive):
// tanggal (YYYY-MM-DD), nama_obat, qty, harga_satuan (opsional), harga_type (opsional: MEDIS/UMUM),
// no_transaksi (opsional - baris dengan no_transaksi sama akan digabung jadi 1 transaksi)
//
// Catatan: data ini HANYA dipakai untuk mengisi riwayat penjualan lama (misal untuk menguji
// perhitungan EOQ), sehingga TIDAK mengurangi stok obat saat ini.

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_IMPORT.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk upload riwayat penjualan" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, any>[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    rows = raw.map((r: any) => {
      const normalized: Record<string, any> = {};
      for (const key of Object.keys(r)) normalized[normalizeKey(key)] = r[key];
      return normalized;
    });
  } catch {
    return NextResponse.json({ error: "Gagal membaca file. Pastikan format .xlsx atau .csv sesuai template" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File kosong atau format tidak dikenali" }, { status: 400 });
  }

  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    select: { id: true, name: true, hargaJualUmum: true },
  });
  const medicineByName = new Map(medicines.map((m) => [m.name.trim().toLowerCase(), m]));

  const errors: string[] = [];

  type ParsedRow = {
    rowNum: number;
    medicineId: string;
    qty: number;
    hargaSatuan: number;
    hargaType: "MEDIS" | "UMUM";
    tanggal: Date;
    groupKey: string;
  };

  const parsedRows: ParsedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +2 karena baris 1 = header

    const tanggalRaw = r.tanggal ?? r.tgl ?? r.date ?? "";
    const namaObat = String(r.nama_obat ?? r.nama ?? r.medicine ?? "").trim();
    const qty = Number(r.qty ?? r.jumlah ?? 0);
    const hargaTypeRaw = String(r.harga_type ?? r.tipe_harga ?? "UMUM").trim().toUpperCase();
    const hargaType: "MEDIS" | "UMUM" = hargaTypeRaw === "MEDIS" ? "MEDIS" : "UMUM";
    const noTransaksi = String(r.no_transaksi ?? "").trim();

    if (!namaObat) { errors.push(`Baris ${rowNum}: nama obat wajib diisi`); continue; }
    if (!qty || qty <= 0) { errors.push(`Baris ${rowNum}: qty tidak valid`); continue; }

    const tanggal = tanggalRaw instanceof Date ? tanggalRaw : new Date(tanggalRaw);
    if (isNaN(tanggal.getTime())) { errors.push(`Baris ${rowNum}: tanggal tidak valid`); continue; }

    const medicine = medicineByName.get(namaObat.toLowerCase());
    if (!medicine) { errors.push(`Baris ${rowNum}: obat "${namaObat}" tidak ditemukan di Data Obat`); continue; }

    const hargaSatuan = Number(r.harga_satuan ?? r.harga ?? 0) || Number(medicine.hargaJualUmum);

    parsedRows.push({
      rowNum,
      medicineId: medicine.id,
      qty,
      hargaSatuan,
      hargaType,
      tanggal,
      groupKey: noTransaksi || `__row_${rowNum}`,
    });
  }

  // Kelompokkan baris dengan no_transaksi yang sama menjadi 1 transaksi penjualan
  const groups = new Map<string, ParsedRow[]>();
  for (const row of parsedRows) {
    const list = groups.get(row.groupKey) ?? [];
    list.push(row);
    groups.set(row.groupKey, list);
  }

  let successTransaksi = 0;
  let successItem = 0;

  for (const [, items] of groups) {
    try {
      const totalItem = items.reduce((s, it) => s + it.qty, 0);
      const totalHarga = items.reduce((s, it) => s + it.qty * it.hargaSatuan, 0);
      const tanggal = items[0].tanggal;
      const rand = Math.floor(Math.random() * 900000 + 100000);

      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            noTransaksi: `IMPORT-${tanggal.getTime()}-${rand}`,
            kasirId: (session.user as any).id,
            totalItem,
            totalHarga,
            bayar: totalHarga,
            kembalian: 0,
            createdAt: tanggal,
          },
        });

        await tx.saleDetail.createMany({
          data: items.map((it) => ({
            saleId: sale.id,
            medicineId: it.medicineId,
            hargaType: it.hargaType,
            qty: it.qty,
            hargaSatuan: it.hargaSatuan,
            subtotal: it.qty * it.hargaSatuan,
          })),
        });
      });

      successTransaksi++;
      successItem += items.length;
    } catch (err: any) {
      for (const it of items) errors.push(`Baris ${it.rowNum}: ${err.message ?? "gagal disimpan"}`);
    }
  }

  if (successTransaksi > 0) {
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATE",
        entity: "Sale",
        detail: { importCount: successTransaksi, itemCount: successItem, fileName: file.name, note: "Upload riwayat penjualan untuk uji coba (tidak mengurangi stok)" },
      },
    });
  }

  return NextResponse.json({
    data: {
      totalBaris: rows.length,
      totalTransaksi: groups.size,
      successTransaksi,
      successItem,
      failed: errors.length,
      errors: errors.slice(0, 20),
    },
  });
}
