"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { FloatingCart } from "./floating-cart";
import { BuiltByBenchworks } from "./built-by-benchworks";

export function LayoutShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/pos") || pathname.startsWith("/yard");
  const isQuote = pathname.startsWith("/quote/") || pathname.startsWith("/q/");
  const isBulkApp = pathname.startsWith("/app");
  // Tinsel Time Long Island (seasonal brand) renders its own chrome.
  const isHolidayLights =
    pathname === "/holiday-lights" || pathname.startsWith("/holiday-lights/") || pathname === "/lights";

  if (isPOS || isQuote || isBulkApp || isHolidayLights) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {footer}
      <BuiltByBenchworks />
      <FloatingCart />
    </div>
  );
}
