import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Peta hak akses per role, sesuai tabel terbaru:
// Fitur                | Apoteker | Asisten | Admin
// Input Obat           |    ✓     |    ✗    |  ✗
// Restock              |    ✓     |    ✓    |  ✗
// Penjualan            |    ✓     |    ✓    |  ✓
// Monitoring           |    ✓     |    ✓    |  ✓
// Kelola Utang/Faktur  |    ✓     |    ✗    |  ✓
// Laporan              |    ✓     |    ✗    |  ✓
const ACCESS_MAP: Record<string, string[]> = {
  "/dashboard": ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"],
  "/obat": ["APOTEKER"],
  "/restock": ["APOTEKER", "ASISTEN_APOTEKER"],
  "/penjualan": ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"],
  "/riwayat-penjualan": ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"],
  "/monitoring-stok": ["APOTEKER", "ASISTEN_APOTEKER", "ADMIN"],
  "/utang-faktur": ["APOTEKER", "ADMIN"],
  "/laporan": ["APOTEKER", "ADMIN"],
  "/ganti-password": ["APOTEKER"],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth?.token as any)?.role as string | undefined;

    const matchedKey = Object.keys(ACCESS_MAP).find((key) =>
      pathname.startsWith(key)
    );

    if (matchedKey && role && !ACCESS_MAP[matchedKey].includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/obat/:path*",
    "/restock/:path*",
    "/penjualan/:path*",
    "/riwayat-penjualan/:path*",
    "/monitoring-stok/:path*",
    "/utang-faktur/:path*",
    "/laporan/:path*",
    "/ganti-password/:path*",
  ],
};
