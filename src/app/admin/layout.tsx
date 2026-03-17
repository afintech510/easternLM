import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin | Eastern LM",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check auth server-side — hide sidebar/chrome on login and unauthorized pages
  let isAdmin = false;
  try {
    const supabase = await getSupabaseServerClientWithCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: account } = await (supabase as any)
        .from("accounts")
        .select("role, is_active")
        .eq("id", user.id)
        .single();
      isAdmin = account?.role === "admin" && account?.is_active !== false;
    }
  } catch {
    // Cookie store unavailable (edge case) — render minimal layout
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
