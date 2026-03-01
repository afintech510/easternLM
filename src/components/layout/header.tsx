import Link from "next/link";
import { siteConfig } from "@/config/site";
import { CartActions } from "@/components/layout/cart-actions";
import { MobileMenu } from "@/components/layout/mobile-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/95 backdrop-blur">
      <div className="border-b border-primary/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs md:text-sm">
          <p>Same-day delivery available Monday-Friday on early orders.</p>
          <a className="font-semibold hover:underline" href={siteConfig.phoneHref}>
            {siteConfig.phoneDisplay}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex flex-col">
          <span className="[font-family:var(--font-display)] text-xl text-primary">
            Eastern Landscape
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mason Supply
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {siteConfig.navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <CartActions />

        <div className="md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
