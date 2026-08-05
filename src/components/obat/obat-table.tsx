"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Upload, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatRupiah, formatTanggal, getStockStatus, getExpiredStatus } from "@/lib/utils";
import type { MedicineListItem } from "@/types";
import { MedicineFormModal } from "@/components/obat/medicine-form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const JENIS_OPTIONS = ["TABLET", "SIRUP", "AMPUL", "KAPSUL", "TUBE", "TETES_TELINGA", "TETES_MATA", "SALEP_MATA"];
const JENIS_LABEL: Record<string, string> = {
  TABLET: "Tablet", SIRUP: "Sirup", AMPUL: "Ampul", KAPSUL: "Kapsul", TUBE: "Tube",
  TETES_TELINGA: "Tetes Telinga", TETES_MATA: "Tetes Mata", SALEP_MATA: "Salep Mata",
};

export function ObatTable({ initialData }: { initialData: MedicineListItem[] }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  // Selaraskan tabel dengan data terbaru dari server setiap kali halaman di-refresh
  useEffect(() => {
    setData(initialData);
  }, [initialData]);
  const [jenisFilter, setJenisFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof MedicineListItem>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MedicineListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MedicineListItem | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const filtered = useMemo(() => {
    let result = data.filter((m) => {
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
        m.manufacturerName?.toLowerCase().includes(search.toLowerCase());
      const matchJenis = !jenisFilter || m.type === jenisFilter;
      const matchStatus =
        !statusFilter || getStockStatus(m.stok, m.minStok).label.toLowerCase() === statusFilter;
      return matchSearch && matchJenis && matchStatus;
    });

    result = result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return result;
  }, [data, search, jenisFilter, statusFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: keyof MedicineListItem) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleSave(item: MedicineListItem) {
    setData((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) return prev.map((p) => (p.id === item.id ? item : p));
      return [item, ...prev];
    });
    toast.success(editItem ? "Data obat berhasil diperbarui" : "Obat baru berhasil ditambahkan");
    setModalOpen(false);
    setEditItem(null);
    router.refresh(); // sinkronkan ulang dengan database agar semua pengguna melihat data terbaru
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/medicines/${deleteItem.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal menghapus data obat");

      setData((prev) => prev.filter((p) => p.id !== deleteItem.id));
      toast.success(`"${deleteItem.name}" berhasil dihapus`);
      setDeleteItem(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus data obat");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/medicines`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal menghapus semua data obat");

      setData([]);
      toast.success(`${json.data.count} data obat berhasil dihapus`);
      setConfirmDeleteAll(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus semua data obat");
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/medicines/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal mengimpor file");

      const { total, success, failed, errors } = json.data;
      if (success > 0) {
        toast.success(`${success} dari ${total} obat berhasil diimpor`);
        router.refresh();
      }
      if (failed > 0) {
        toast.error(`${failed} baris gagal diimpor${errors?.[0] ? `: ${errors[0]}` : ""}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengimpor file. Pastikan format sesuai template (.xlsx/.csv)");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama obat, PBF, atau pabrik..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={jenisFilter}
            onChange={(e) => { setJenisFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Jenis</option>
            {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="aman">Aman</option>
            <option value="menipis">Menipis</option>
            <option value="habis">Habis</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import
          </button>

          <button
            onClick={() => { setEditItem(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Tambah Obat
          </button>

          <button
            onClick={() => setConfirmDeleteAll(true)}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Hapus Semua
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 w-10">No</th>
                {[
                  ["name", "Nama Obat"], ["type", "Jenis"], ["stok", "Stok"],
                  ["hargaBeli", "Harga Beli"], ["hargaJualMedis1", "Harga Medis 1 (12%)"], ["hargaJualMedis2", "Harga Medis 2 (15%)"], ["hargaJualMedis3", "Harga Medis 3 (8.5%)"], ["hargaJualUmum", "Harga Umum"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key as keyof MedicineListItem)}
                    className="text-left px-4 py-3 cursor-pointer select-none hover:text-slate-700"
                  >
                    {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                ))}
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Expired</th>
                <th className="text-left px-4 py-3">PBF</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-400">
                    Tidak ada data obat ditemukan
                  </td>
                </tr>
              ) : (
                paginated.map((m, idx) => {
                  const stockStatus = getStockStatus(m.stok, m.minStok);
                  const expStatus = m.expiredTerdekat ? getExpiredStatus(m.expiredTerdekat) : null;
                  const colorMap: Record<string, string> = {
                    red: "bg-red-100 text-red-700",
                    yellow: "bg-amber-100 text-amber-700",
                    green: "bg-emerald-100 text-emerald-700",
                  };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                      <td className="px-4 py-3 text-slate-600">{JENIS_LABEL[m.type] ?? m.type}</td>
                      <td className="px-4 py-3 text-slate-600">{m.stok}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRupiah(m.hargaBeli)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRupiah(m.hargaJualMedis1)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRupiah(m.hargaJualMedis2)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRupiah(m.hargaJualMedis3)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRupiah(m.hargaJualUmum)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${colorMap[stockStatus.color]}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.expiredTerdekat ? (
                          <div className="flex flex-col">
                            <span className="text-slate-600">{formatTanggal(m.expiredTerdekat)}</span>
                            {expStatus && expStatus.label !== "Aman" && (
                              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 w-fit mt-0.5 ${colorMap[expStatus.color]}`}>
                                {expStatus.label}
                              </span>
                            )}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.supplierName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Detail">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditItem(m); setModalOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-500"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-red-500"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <p className="text-slate-500">
            Menampilkan {paginated.length} dari {filtered.length} obat
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-slate-600">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <MedicineFormModal
          initialData={editItem}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}

      {deleteItem && (
        <ConfirmDialog
          title="Hapus Data Obat"
          message={`Yakin ingin menghapus "${deleteItem.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel={deleting ? "Menghapus..." : "Ya, Hapus"}
          variant="danger"
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
        />
      )}

      {confirmDeleteAll && (
        <ConfirmDialog
          title="Hapus Semua Data Obat"
          message={`Yakin ingin menghapus SELURUH data obat (${data.length} item)? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel={deletingAll ? "Menghapus..." : "Ya, Hapus Semua"}
          variant="danger"
          onCancel={() => setConfirmDeleteAll(false)}
          onConfirm={handleDeleteAll}
        />
      )}
    </div>
  );
}
