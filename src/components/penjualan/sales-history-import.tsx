"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  totalBaris: number;
  totalTransaksi: number;
  successTransaksi: number;
  successItem: number;
  failed: number;
  errors: string[];
};

export function SalesHistoryImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/sales/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Gagal upload file");

      setResult(json.data);
      if (json.data.successTransaksi > 0) {
        toast.success(`${json.data.successTransaksi} transaksi riwayat berhasil ditambahkan`);
        router.refresh();
      } else {
        toast.error("Tidak ada transaksi yang berhasil ditambahkan, cek detail error di bawah");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const csv = [
      "tanggal,nama_obat,qty,harga_satuan,harga_type,no_transaksi",
      "2025-01-05,Paracetamol 500mg,10,10000,UMUM,",
      "2025-01-05,Amoxicillin 500mg,5,22000,UMUM,",
      "2025-02-10,Paracetamol 500mg,20,10000,UMUM,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_riwayat_penjualan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-brand-700" />
          Upload Riwayat Penjualan (Uji Coba EOQ)
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <p className="text-xs text-slate-500">
            Upload riwayat transaksi penjualan lama dalam format CSV/XLSX untuk mengisi data historis.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Mengunggah..." : "Pilih File (.csv / .xlsx)"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Download className="h-4 w-4" /> Unduh Template
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Kolom: <code>tanggal</code> (YYYY-MM-DD), <code>nama_obat</code>, <code>qty</code>,{" "}
            <code>harga_satuan</code>, <code>harga_type</code> (MEDIS/UMUM), <code>no_transaksi</code> (baris dengan nomor sama akan digabung jadi satu transaksi).
          </p>

          {result && (
            <div className="rounded-lg border bg-slate-50 p-3 text-xs space-y-1">
              <p className="text-slate-700 font-medium">
                {result.successTransaksi} dari {result.totalTransaksi} transaksi berhasil disimpan ({result.successItem} baris item).
              </p>
              {result.failed > 0 && (
                <div className="text-red-600">
                  <p className="font-medium">{result.failed} baris gagal:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
