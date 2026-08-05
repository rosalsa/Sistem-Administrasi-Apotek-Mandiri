"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Menyinkronkan data server secara berkala tanpa perlu refresh manual,
 * sehingga perubahan stok/transaksi dari perangkat/pengguna lain langsung terlihat.
 * Auto-pause saat tab tidak aktif agar tidak boros resource.
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function start() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, intervalMs);
    }
    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    start();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    });

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return null;
}
