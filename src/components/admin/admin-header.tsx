"use client";

import { AdminMobileNav } from "@/components/admin/sidebar";

export function AdminHeader() {
  return (
    <header className="flex h-14 items-center border-b bg-zinc-950 border-zinc-800 px-4">
      <AdminMobileNav />
      <span className="ml-2 text-sm font-medium text-zinc-500 md:hidden">Admin</span>
    </header>
  );
}
