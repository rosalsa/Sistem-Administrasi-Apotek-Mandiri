"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShoppingCart, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KasirView } from "@/components/penjualan/kasir-view";
import { RestockView } from "@/components/restock/restock-view";

type SaleMedicine = { id: string; name: string; stok: number; hargaMedis1: number; hargaMedis2: number; hargaMedis3: number; hargaUmum: number };
type RestockMedicine = { id: string; name: string; isiPerBox: number; stok: number };
type RiwayatItem = { id: string; tanggal: string; namaObat: string; jumlah: number; expired: string; petugas: string };

export function InputDataView({
  saleMedicines,
  restockMedicines,
  initialRiwayat,
  canRestock,
  canSell,
}: {
  saleMedicines: SaleMedicine[];
  restockMedicines: RestockMedicine[];
  initialRiwayat: RiwayatItem[];
  canRestock: boolean;
  canSell: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "restock" && canRestock ? "restock" : canSell ? "penjualan" : "restock";
  const [tab, setTab] = useState<"penjualan" | "restock">(initialTab);

  function switchTab(next: "penjualan" | "restock") {
    setTab(next);
    router.replace(`/input-data?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Input Data</h1>
        <p className="text-sm text-slate-500">Catat penjualan dan barang masuk (restock) dalam satu tempat, stok selalu update otomatis</p>
      </div>

      {canRestock && canSell && (
        <div className="inline-flex rounded-lg border bg-white p-1 gap-1">
          <button
            onClick={() => switchTab("penjualan")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === "penjualan" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <ShoppingCart className="h-4 w-4" /> Penjualan
          </button>
          <button
            onClick={() => switchTab("restock")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === "restock" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <PackagePlus className="h-4 w-4" /> Barang Masuk / Restock
          </button>
        </div>
      )}

      {tab === "penjualan" && canSell && <KasirView medicines={saleMedicines} />}
      {tab === "restock" && canRestock && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-emerald-600" /> Barang Masuk / Restock
          </h3>
          <RestockView medicines={restockMedicines} initialRiwayat={initialRiwayat} />
        </div>
      )}
    </div>
  );
}
