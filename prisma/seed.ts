import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // ---------- Users ----------
  await prisma.user.createMany({
    data: [
      { name: "Pemilik Sarana Apotek", username: "psa", email: "psa@apotek.com", passwordHash: password, role: "PSA" },
      { name: "apt. Dede Jamiatul Midiyah, S.Farm", username: "apoteker", email: "apoteker@apotek.com", passwordHash: password, role: "APOTEKER" },
      { name: "Siti Aminah", username: "asisten", email: "asisten@apotek.com", passwordHash: password, role: "ASISTEN_APOTEKER" },
      { name: "Rizky Junaedi", username: "admin", email: "admin@apotek.com", passwordHash: password, role: "ADMIN" },
    ],
    skipDuplicates: true,
  });

  // ---------- Master Data ----------
  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: { id: "seed-supplier-1", name: "PT Kimia Farma Trading", address: "Jakarta", phone: "021-1234567" },
  });

  const manufacturer = await prisma.manufacturer.upsert({
    where: { id: "seed-manufacturer-1" },
    update: {},
    create: { id: "seed-manufacturer-1", name: "Kalbe Farma" },
  });

  // ---------- Contoh Obat ----------
  const medicines = [
    { name: "Paracetamol 500mg", type: "TABLET" as const, hargaBeli: 5000, hargaJualMedis1: 5600, hargaJualMedis2: 5750, hargaJualMedis3: 5425, hargaJualUmum: 10000, stok: 150, minStok: 20 },
    { name: "Amoxicillin 500mg", type: "KAPSUL" as const, hargaBeli: 12000, hargaJualMedis1: 13440, hargaJualMedis2: 13800, hargaJualMedis3: 13020, hargaJualUmum: 22000, stok: 8, minStok: 15 },
    { name: "OBH Combi Sirup", type: "SIRUP" as const, hargaBeli: 15000, hargaJualMedis1: 16800, hargaJualMedis2: 17250, hargaJualMedis3: 16275, hargaJualUmum: 26000, stok: 0, minStok: 10 },
  ];

  for (const m of medicines) {
    await prisma.medicine.create({
      data: {
        ...m,
        supplierId: supplier.id,
        manufacturerId: manufacturer.id,
        isiPerBox: 10,
        batches: {
          create: {
            noFaktur: "FKT-SEED-001",
            qtyMasuk: m.stok,
            qtySisa: m.stok,
            expiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180), // +180 hari
          },
        },
      },
    });
  }

  console.log("Seed selesai. Login dengan:");
  console.log("  Apoteker  -> username: apoteker  | password: password123");
  console.log("  Asisten   -> username: asisten   | password: password123");
  console.log("  Admin     -> username: admin     | password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
