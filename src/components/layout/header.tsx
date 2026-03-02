"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { CartActions } from "@/components/layout/cart-actions";
import { MobileMenu } from "@/components/layout/mobile-menu";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6">
          <p className="hidden sm:block">
            Same-day delivery on orders placed before 11 AM
          </p>
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-6">
            <span className="text-primary-foreground/60">{siteConfig.hours[0]}</span>
            <a
              className="flex items-center gap-1.5 font-semibold transition-colors hover:text-accent"
              href={siteConfig.phoneHref}
            >
              <Phone className="size-3" />
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="border-b border-border/60 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="[font-family:var(--font-display)] text-2xl text-primary">
              Eastern
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Landscape & Mason Supply
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {siteConfig.navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <CartActions />

          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
