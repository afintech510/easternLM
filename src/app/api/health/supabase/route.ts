import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function simplifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export async function GET() {
  let publicConnected = false;
  let publicDetail = "";

  try {
    const serverClient = getSupabaseServerClient();
    const publicProbe = await serverClient.from("site_settings").select("id").limit(1);

    publicConnected =
      !publicProbe.error ||
      publicProbe.error.code === "PGRST205" ||
      publicProbe.error.code === "42P01" ||
      publicProbe.error.message.toLowerCase().includes("relation");
    publicDetail = publicProbe.error?.message ?? "Connected";
  } catch (error) {
    publicConnected = false;
    publicDetail = simplifyError(error);
  }

  let adminConnected = false;
  let adminError = "";

  try {
    const adminClient = getSupabaseAdminClient();
    const adminProbe = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
    adminConnected = !adminProbe.error;
    adminError = adminProbe.error?.message ?? "";
  } catch (error) {
    adminConnected = false;
    adminError = simplifyError(error);
  }

  return NextResponse.json({
    ok: publicConnected && adminConnected,
    checks: {
      public: {
        connected: publicConnected,
        detail: publicDetail,
      },
      admin: {
        connected: adminConnected,
        detail: adminConnected ? "Connected" : adminError,
      },
    },
    checkedAt: new Date().toISOString(),
  });
}
