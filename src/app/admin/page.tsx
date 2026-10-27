import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminClaims } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminPage() {
  const claims = await getAdminClaims();
  if (!claims) redirect("/admin/login");
  return <AdminDashboard user={claims} />;
}
