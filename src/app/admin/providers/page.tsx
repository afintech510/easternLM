import { requireAdmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import ProvidersClient from "./providers-client";

export default async function ProvidersPage() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) redirect("/admin/login");
  return <ProvidersClient />;
}
