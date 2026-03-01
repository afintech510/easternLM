"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { CartActions } from "@/components/layout/cart-actions";
import { MobileMenu } from "@/components/layout/mobile-menu";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-primary text-primary-foreground">
      <div className="border-b border-primary-foreground/10 bg-accent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs text-accent-foreground sm:text-sm">
          <p>Same-day delivery available Monday - Friday on early orders.</p>
          <a className="font-semibold hover:underline" href={siteConfig.phoneHref}>
            {siteConfig.phoneDisplay}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex flex-col">
          <span className="[font-family:var(--font-display)] text-xl text-primary-foreground">
            Eastern Landscape
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">
            Mason Supply
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {siteConfig.navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-accent underline underline-offset-4"
                    : "text-primary-foreground/80 hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <CartActions />

        <div className="md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
