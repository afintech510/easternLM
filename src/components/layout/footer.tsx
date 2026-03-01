import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const thisYear = new Date().getFullYear();

  return (
    <footer className="border-t border-primary/15 bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-4">
        <section className="space-y-4 md:col-span-2">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
            Eastern Landscape & Mason Supply
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Family-owned supply yard serving homeowners, contractors, and builders
            across Suffolk County.
          </p>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span>
                {siteConfig.addressLine1}, {siteConfig.addressLine2}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              <a href={siteConfig.phoneHref} className="hover:underline">
                {siteConfig.phoneDisplay}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <a href={`mailto:${siteConfig.email}`} className="hover:underline">
                {siteConfig.email}
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Navigate
          </h3>
          <ul className="space-y-2 text-sm">
            {siteConfig.navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Newsletter
          </h3>
          <form className="space-y-2">
            <Input type="email" required placeholder="Your email address" />
            <Button className="w-full" type="submit">
              Join Pro Updates
            </Button>
          </form>
          <div className="space-y-1 text-xs text-muted-foreground">
            {siteConfig.hours.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      </div>

      <Separator />

      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {thisYear} Eastern Landscape & Mason Supply. All rights reserved.</p>
        <p>Proudly serving Suffolk County, New York.</p>
      </div>
    </footer>
  );
}
