"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/pos") || pathname.startsWith("/yard");
  const isQuote = pathname.startsWith("/quote/") || pathname.startsWith("/q/");

  if (isPOS || isQuote) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
