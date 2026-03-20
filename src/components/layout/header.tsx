"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { CartActions } from "@/components/layout/cart-actions";
import { MobileMenu } from "@/components/layout/mobile-menu";

const navItems = [
  { href: "/shop", label: "Shop" },
  { href: "/services", label: "Services" },
  { href: "/delivery", label: "Delivery" },
  { href: "/calculator", label: "Calculator" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();

  // Hide full header on admin pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/pos")) return null;

  return (
    <header className="sticky top-0 z-50">
      {/* ── Utility bar ────────────────────────────────── */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6">
          <p className="flex items-center gap-1.5">
            <Truck className="size-3 text-accent" />
            <span className="hidden sm:inline">Same-Day Delivery &middot; Order by 11 AM</span>
            <span className="sm:hidden">Same-Day Delivery</span>
          </p>
          <div className="flex items-center gap-2.5">
            <a
              href={siteConfig.phoneHref}
              className="flex items-center gap-1.5 font-semibold transition-colors hover:text-accent"
            >
              <Phone className="size-3" />
              {siteConfig.phoneDisplay}
            </a>
            <a
              href={siteConfig.smsHref}
              className="hidden sm:inline-flex rounded border border-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:text-accent hover:border-accent/30"
            >
              Text Us
            </a>
          </div>
        </div>
      </div>

      {/* ── Main nav ───────────────────────────────────── */}
      <div className="border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-elm-blue.webp"
              alt="Eastern Landscape & Mason Supply"
              width={200}
              height={57}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
            {navItems.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3.5 py-2 text-base font-medium transition-colors ${
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

          {/* Right side: cart (desktop) + mobile controls */}
          <div className="flex items-center gap-2">
            <CartActions />

            {/* Mobile: phone icon + cart + hamburger */}
            <div className="flex items-center gap-1 lg:hidden">
              <a
                href={siteConfig.phoneHref}
                className="flex size-9 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
                aria-label="Call us"
              >
                <Phone className="size-5" />
              </a>
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
