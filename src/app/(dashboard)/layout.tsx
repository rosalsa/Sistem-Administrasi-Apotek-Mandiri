import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role as "PSA" | "APOTEKER" | "ASISTEN_APOTEKER" | "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50">
      <AutoRefresh />
      <Sidebar role={role} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Navbar user={session.user} role={role} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
