import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

export function Footer() {
  const thisYear = new Date().getFullYear();

  return (
    <footer>
      {/* Green accent line */}
      <div className="h-1 bg-accent" />

      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Company info */}
          <section className="space-y-5 lg:col-span-1">
            <div>
              <h2 className="[font-family:var(--font-display)] text-2xl">
                Eastern
              </h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">
                Landscape & Mason Supply
              </p>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/60">
              Family-owned supply yard serving homeowners, contractors, and builders
              across Suffolk County since the 1990s.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/40">
              Contact
            </h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="text-primary-foreground/80">
                  {siteConfig.addressLine1}<br />
                  {siteConfig.addressLine2}
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-accent" />
                <a href={siteConfig.phoneHref} className="text-primary-foreground/80 transition-colors hover:text-accent">
                  {siteConfig.phoneDisplay}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-accent" />
                <a href={`mailto:${siteConfig.email}`} className="text-primary-foreground/80 transition-colors hover:text-accent">
                  {siteConfig.email}
                </a>
              </p>
            </div>
          </section>

          {/* Quick Links */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/40">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              {siteConfig.navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-primary-foreground/70 transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Hours + CTA */}
          <section className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/40">
              Hours
            </h3>
            <div className="space-y-2 text-sm">
              {siteConfig.hours.map((line) => (
                <p key={line} className="flex items-center gap-2 text-primary-foreground/70">
                  <Clock className="size-3.5 shrink-0 text-accent/60" />
                  {line}
                </p>
              ))}
            </div>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/contact">Get a Quote</Link>
            </Button>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-primary-foreground/40 sm:px-6 md:flex-row md:items-center md:justify-between">
            <p>&copy; {thisYear} Eastern Landscape & Mason Supply. All rights reserved.</p>
            <p>Proudly serving Suffolk County, Long Island.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
