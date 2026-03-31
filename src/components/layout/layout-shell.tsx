"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
import { FloatingCart } from "./floating-cart";
import { PromoPopup } from "../marketing/promo-popup";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/pos") || pathname.startsWith("/yard");
  const isQuote = pathname.startsWith("/quote/") || pathname.startsWith("/q/");
  const isBulkApp = pathname.startsWith("/app");

  if (isPOS || isQuote || isBulkApp) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingCart />
      <PromoPopup />
    </div>
  );
}
