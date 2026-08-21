"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SalesHistoryImport } from "@/components/penjualan/sales-history-import";

type MedicineOption = {
  id: string; name: string; stok: number;
  hargaMedis1: number; hargaMedis2: number; hargaMedis3: number; hargaUmum: number;
};

type PriceOption = "UMUM" | "MEDIS1" | "MEDIS2" | "MEDIS3";

type CartItem = {
  medicineId: string; name: string; priceOption: PriceOption;
  hargaType: "MEDIS" | "UMUM";
  hargaSatuan: number; qty: number; stokTersedia: number;
};

function priceFor(m: MedicineOption, opt: PriceOption): number {
  if (opt === "MEDIS1") return m.hargaMedis1;
  if (opt === "MEDIS2") return m.hargaMedis2;
  if (opt === "MEDIS3") return m.hargaMedis3;
  return m.hargaUmum;
}

export function KasirView({ medicines }: { medicines: MedicineOption[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bayar, setBayar] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [successModal, setSuccessModal] = useState<string | null>(null);

  const filteredMedicines = useMemo(() => {
    if (!search) return [];
    return medicines
      .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
  }, [search, medicines]);

  const totalItem = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalHarga = cart.reduce((sum, c) => sum + c.qty * c.hargaSatuan, 0);
  const bayarNum = parseFloat(bayar) || 0;
  const kembalian = Math.max(0, bayarNum - totalHarga);

  function addToCart(m: MedicineOption) {
    if (m.stok <= 0) {
      toast.error(`Stok "${m.name}" habis, tidak bisa ditambahkan`);
      return;
    }
    setCart((prev) => {
      const exists = prev.find((c) => c.medicineId === m.id);
      if (exists) {
        if (exists.qty >= m.stok) {
          toast.error(`Stok "${m.name}" tidak mencukupi`);
          return prev;
        }
        return prev.map((c) => c.medicineId === m.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        medicineId: m.id, name: m.name, priceOption: "UMUM", hargaType: "UMUM",
        hargaSatuan: m.hargaUmum, qty: 1, stokTersedia: m.stok,
      }];
    });
    setSearch("");
    setDropdownOpen(false);
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((c) => {
      if (c.medicineId !== id) return c;
      const newQty = c.qty + delta;
      if (newQty < 1) return c;
      if (newQty > c.stokTersedia) {
        toast.error("Qty melebihi stok tersedia");
        return c;
      }
      return { ...c, qty: newQty };
    }));
  }

  function setQty(id: string, value: string) {
    setCart((prev) => prev.map((c) => {
      if (c.medicineId !== id) return c;
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed)) return { ...c, qty: 1 };
      if (parsed < 1) return { ...c, qty: 1 };
      if (parsed > c.stokTersedia) {
        toast.error("Qty melebihi stok tersedia");
        return { ...c, qty: c.stokTersedia };
      }
      return { ...c, qty: parsed };
    }));
  }

  function updatePriceOption(id: string, opt: PriceOption) {
    const medicine = medicines.find((m) => m.id === id);
    if (!medicine) return;
    const hargaSatuan = priceFor(medicine, opt);
    const hargaType: "MEDIS" | "UMUM" = opt === "UMUM" ? "UMUM" : "MEDIS";
    setCart((prev) => prev.map((c) =>
      c.medicineId === id ? { ...c, priceOption: opt, hargaType, hargaSatuan } : c
    ));
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.medicineId !== id));
  }

  function clearCart() {
    setCart([]);
    setBayar("");
    setConfirmClear(false);
  }

  async function processTransaction() {
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    if (bayarNum < totalHarga) {
      toast.error("Jumlah bayar kurang dari total harga");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, bayar: bayarNum }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Transaksi gagal diproses");

      setSuccessModal(json.data.noTransaksi);
      setCart([]);
      setBayar("");
      router.refresh(); // stok, riwayat, dan dashboard langsung sinkron
    } catch (e: any) {
      toast.error(e?.message ?? "Transaksi gagal diproses");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Penjualan</h1>
        <p className="text-sm text-slate-500">Buat transaksi penjualan baru</p>
      </div>

      <SalesHistoryImport />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Search & pilih obat */}
        <div className="lg:col-span-3 bg-white rounded-xl border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Cari nama obat untuk ditambahkan ke keranjang..."
              className="w-full pl-9 pr-3 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {dropdownOpen && filteredMedicines.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {filteredMedicines.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addToCart(m)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50 flex items-center justify-between text-sm border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">Stok: {m.stok}</p>
                    </div>
                    <p className="font-medium text-brand-600">{formatRupiah(m.hargaUmum)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ShoppingCart className="h-10 w-10 mb-2" />
                <p className="text-sm">Keranjang masih kosong</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.medicineId} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <select
                        value={item.priceOption}
                        onChange={(e) => updatePriceOption(item.medicineId, e.target.value as PriceOption)}
                        className="text-xs border rounded-md px-1.5 py-1"
                      >
                        <option value="UMUM">Harga Umum</option>
                        <option value="MEDIS1">Harga Medis 1 (12%)</option>
                        <option value="MEDIS2">Harga Medis 2 (15%)</option>
                        <option value="MEDIS3">Harga Medis 3 (8.5%)</option>
                      </select>
                      <span className="text-xs text-brand-600 font-medium">{formatRupiah(item.hargaSatuan)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => updateQty(item.medicineId, -1)} className="p-1 rounded-md border hover:bg-slate-50">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={item.stokTersedia}
                      value={item.qty}
                      onChange={(e) => setQty(item.medicineId, e.target.value)}
                      className="w-14 text-center text-sm font-medium border rounded-md px-1 py-1"
                    />
                    <button onClick={() => updateQty(item.medicineId, 1)} className="p-1 rounded-md border hover:bg-slate-50">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="w-24 text-right font-semibold text-sm text-slate-800 ml-3">
                    {formatRupiah(item.qty * item.hargaSatuan)}
                  </p>

                  <button onClick={() => removeItem(item.medicineId)} className="ml-2 p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ringkasan & Pembayaran */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4 h-fit sticky top-20 space-y-4">
          <h3 className="font-semibold text-slate-800">Ringkasan Transaksi</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Total Item</span>
              <span className="text-slate-800 font-medium">{totalItem}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Harga</span>
              <span className="text-slate-800 font-semibold text-base">{formatRupiah(totalHarga)}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <label className="text-sm font-medium text-slate-700">Jumlah Bayar</label>
            <input
              type="number"
              value={bayar}
              onChange={(e) => setBayar(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-between items-center bg-brand-50 rounded-lg px-3 py-2.5">
            <span className="text-sm text-brand-700">Kembalian</span>
            <span className="font-bold text-brand-700">{formatRupiah(kembalian)}</span>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={processTransaction}
              disabled={processing || cart.length === 0}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Proses Transaksi
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={cart.length === 0}
              className="w-full border border-slate-200 text-slate-600 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Kosongkan Keranjang
            </button>
          </div>
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Kosongkan Keranjang"
          message="Semua item di keranjang akan dihapus. Lanjutkan?"
          confirmLabel="Ya, Kosongkan"
          variant="danger"
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearCart}
        />
      )}

      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-2xl">✓</div>
            <h3 className="font-semibold text-slate-800 text-lg">Transaksi Berhasil</h3>
            <p className="text-sm text-slate-500">No. Transaksi: <span className="font-medium text-slate-700">{successModal}</span></p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm mt-2"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
