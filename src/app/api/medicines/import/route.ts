import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const CAN_MANAGE = ["PSA", "APOTEKER"]; // PSA & Apoteker yang boleh kelola data obat/restock

// Kolom yang diharapkan di file Excel/CSV (header baris pertama, tidak case sensitive):
// nama_obat, jenis, no_faktur, harga_beli, harga_jual_medis_1, harga_jual_medis_2, harga_jual_medis_3, harga_jual_umum,
// expired (YYYY-MM-DD), pbf, pabrik, stok_awal_box, isi_per_box, min_stok

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!CAN_MANAGE.includes(role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses untuk import data" }, { status: 403 });
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

  const errors: string[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +2 karena baris 1 = header

    const name = String(r.nama_obat ?? r.nama ?? "").trim();
    const jenis = String(r.jenis ?? r.type ?? "").trim();
    const noFaktur = String(r.no_faktur ?? r.nomor_faktur ?? "").trim() || `IMPORT-${Date.now()}-${i}`;
    const hargaBeli = Number(r.harga_beli ?? 0);
    const hargaJualMedis1 = Number(r.harga_jual_medis_1 ?? r.harga_jual_medis1 ?? r.harga_jual_medis ?? 0);
    const hargaJualMedis2 = Number(r.harga_jual_medis_2 ?? r.harga_jual_medis2 ?? r.harga_jual_medis ?? 0);
    const hargaJualMedis3 = Number(r.harga_jual_medis_3 ?? r.harga_jual_medis3 ?? r.harga_jual_medis ?? 0);
    const hargaJualUmum = Number(r.harga_jual_umum ?? 0);
    const expiredRaw = r.expired ?? r.tanggal_expired ?? "";
    const pbf = String(r.pbf ?? r.nama_pbf ?? "-").trim() || "-";
    const pabrik = String(r.pabrik ?? r.nama_pabrik ?? "-").trim() || "-";
    const stokAwalBox = Number(r.stok_awal_box ?? r.stok_awal ?? 0);
    const isiPerBox = Number(r.isi_per_box ?? 1) || 1;
    const minStok = Number(r.min_stok ?? 10) || 10;

    if (!name) { errors.push(`Baris ${rowNum}: nama obat wajib diisi`); continue; }
    if (!jenis) { errors.push(`Baris ${rowNum}: jenis obat wajib diisi`); continue; }
    if (!hargaBeli || !hargaJualMedis1 || !hargaJualMedis2 || !hargaJualMedis3 || !hargaJualUmum) { errors.push(`Baris ${rowNum}: harga tidak valid`); continue; }

    const expiredDate = expiredRaw instanceof Date ? expiredRaw : new Date(expiredRaw);
    if (isNaN(expiredDate.getTime())) { errors.push(`Baris ${rowNum}: tanggal expired tidak valid`); continue; }

    try {
      await prisma.$transaction(async (tx) => {
        const supplier =
          (await tx.supplier.findFirst({ where: { name: pbf } })) ??
          (await tx.supplier.create({ data: { name: pbf } }));
        const manufacturer =
          (await tx.manufacturer.findFirst({ where: { name: pabrik } })) ??
          (await tx.manufacturer.create({ data: { name: pabrik } }));

        const stokAwal = stokAwalBox * isiPerBox;

        const medicine = await tx.medicine.create({
          data: {
            name,
            type: jenis,
            supplierId: supplier.id,
            manufacturerId: manufacturer.id,
            hargaBeli,
            hargaJualMedis1,
            hargaJualMedis2,
            hargaJualMedis3,
            hargaJualUmum,
            stok: stokAwal,
            isiPerBox,
            minStok,
          },
        });

        if (stokAwal > 0) {
          const purchase = await tx.purchase.create({
            data: {
              medicineId: medicine.id,
              supplierId: supplier.id,
              noFaktur,
              jumlahBox: stokAwalBox,
              isiPerBox,
              totalMasuk: stokAwal,
              expiredBatch: expiredDate,
              petugasId: (session.user as any).id,
            },
          });

          await tx.medicineBatch.create({
            data: {
              medicineId: medicine.id,
              noFaktur,
              qtyMasuk: stokAwal,
              qtySisa: stokAwal,
              expiredDate,
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
              keterangan: `Import data - faktur ${noFaktur}`,
            },
          });
        }
      });
      success++;
    } catch (err: any) {
      errors.push(`Baris ${rowNum}: ${err.message ?? "gagal disimpan"}`);
    }
  }

  if (success > 0) {
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATE",
        entity: "Medicine",
        detail: { importCount: success, fileName: file.name },
      },
    });
  }

  return NextResponse.json({
    data: { total: rows.length, success, failed: errors.length, errors: errors.slice(0, 20) },
  });
}
