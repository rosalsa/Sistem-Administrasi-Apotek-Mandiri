/**
 * EOQ (Economic Order Quantity) — metode optimasi inventori untuk menentukan
 * jumlah pembelian/restock yang paling ekonomis, supaya persediaan tidak
 * berlebihan (biaya simpan tinggi) tapi juga tidak kekurangan (sering restock).
 *
 * Rumus klasik:
 *   EOQ = sqrt( (2 * D * S) / H )
 *   D = permintaan tahunan (unit/tahun)
 *   S = biaya pemesanan per order (Rp/order)
 *   H = biaya penyimpanan per unit per tahun (Rp/unit/tahun)
 */

export function calculateEOQ(annualDemand: number, orderingCost: number, holdingCostPerUnit: number): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostPerUnit <= 0) return 0;
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
}

export type EoqStatus = "SEGERA_RESTOCK" | "PERTIMBANGKAN" | "CUKUP" | "DATA_KURANG";

export function getEoqStatus(annualDemand: number, stok: number, eoq: number): EoqStatus {
  if (annualDemand <= 0) return "DATA_KURANG";
  if (stok <= eoq * 0.5) return "SEGERA_RESTOCK";
  if (stok < eoq) return "PERTIMBANGKAN";
  return "CUKUP";
}

export const EOQ_STATUS_LABEL: Record<EoqStatus, string> = {
  SEGERA_RESTOCK: "Segera Restock",
  PERTIMBANGKAN: "Pertimbangkan Restock",
  CUKUP: "Stok Cukup",
  DATA_KURANG: "Data Penjualan Kurang",
};

export const EOQ_STATUS_COLOR: Record<EoqStatus, string> = {
  SEGERA_RESTOCK: "red",
  PERTIMBANGKAN: "yellow",
  CUKUP: "green",
  DATA_KURANG: "slate",
};

export const DEFAULT_ORDERING_COST = 50000; // asumsi biaya administrasi/transport per order (Rp)
export const DEFAULT_HOLDING_COST_PERCENT = 20; // asumsi biaya penyimpanan = 20% dari harga beli per tahun
