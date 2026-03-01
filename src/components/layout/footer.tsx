import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const thisYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-4">
        <section className="space-y-4 md:col-span-2">
          <h2 className="[font-family:var(--font-display)] text-2xl">
            Eastern Landscape & Mason Supply
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/70">
            Family-owned supply yard serving homeowners, contractors, and builders
            across Suffolk County.
          </p>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-accent" />
              <span>
                {siteConfig.addressLine1}, {siteConfig.addressLine2}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-accent" />
              <a href={siteConfig.phoneHref} className="hover:text-accent hover:underline">
                {siteConfig.phoneDisplay}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-accent" />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-accent hover:underline">
                {siteConfig.email}
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">
            Navigate
          </h3>
          <ul className="space-y-2 text-sm">
            {siteConfig.navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-primary-foreground/80 hover:text-accent hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">
            Hours
          </h3>
          <div className="space-y-1 text-sm text-primary-foreground/70">
            {siteConfig.hours.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="pt-2">
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </div>

      <Separator className="bg-primary-foreground/10" />

      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-primary-foreground/50 md:flex-row md:items-center md:justify-between">
        <p>&copy; {thisYear} Eastern Landscape & Mason Supply. All rights reserved.</p>
        <p>Proudly serving Suffolk County, New York.</p>
      </div>
    </footer>
  );
}
