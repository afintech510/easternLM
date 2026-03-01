"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="[font-family:var(--font-display)] text-2xl text-primary">
          Access Denied
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin permissions. Contact the site owner if you
          believe this is an error.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={handleLogout} variant="outline">
            Sign Out
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to Site</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
