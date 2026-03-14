import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

export function Footer() {
  const thisYear = new Date().getFullYear();

  return (
    <footer>
      {/* Accent line */}
      <div className="h-1 bg-accent" />

      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">

          {/* Column 1: Contact & Hours */}
          <section className="space-y-4">
            <div>
              <h2 className="[font-family:var(--font-display)] text-2xl">Eastern</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">Landscape &amp; Mason Supply</p>
            </div>
            <div className="space-y-2.5 text-sm">
              <a
                href={siteConfig.phoneHref}
                className="flex items-center gap-2.5 text-lg font-semibold transition-colors hover:text-accent"
              >
                <Phone className="size-4 text-accent" />
                {siteConfig.phoneDisplay}
              </a>
              <a
                href="https://maps.google.com/?q=110+Frowein+Road+Center+Moriches+NY+11934"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 text-primary-foreground/70 transition-colors hover:text-accent"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{siteConfig.addressLine1}<br />{siteConfig.addressLine2}</span>
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-2.5 text-primary-foreground/70 transition-colors hover:text-accent"
              >
                <Mail className="size-4 text-accent" />
                {siteConfig.email}
              </a>
            </div>
            <div className="space-y-1 text-sm text-primary-foreground/60">
              <p className="flex items-center gap-2"><Clock className="size-3 text-accent/60" /> Mon-Fri: 7 AM - 5 PM</p>
              <p className="flex items-center gap-2"><Clock className="size-3 text-accent/60" /> Saturday: 7 AM - 3 PM</p>
              <p className="flex items-center gap-2"><Clock className="size-3 text-accent/60" /> Sunday: Closed</p>
            </div>
          </section>

          {/* Column 2: Quick Links */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/40">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop" className="text-primary-foreground/70 hover:text-accent">Shop Materials</Link></li>
              <li><Link href="/calculator" className="text-primary-foreground/70 hover:text-accent">Material Calculator</Link></li>
              <li><Link href="/delivery" className="text-primary-foreground/70 hover:text-accent">Delivery Areas</Link></li>
              <li><Link href="/gallery" className="text-primary-foreground/70 hover:text-accent">Project Gallery</Link></li>
              <li><Link href="/blog" className="text-primary-foreground/70 hover:text-accent">Blog</Link></li>
              <li><Link href="/about" className="text-primary-foreground/70 hover:text-accent">About Us</Link></li>
              <li><Link href="/contact" className="text-primary-foreground/70 hover:text-accent">Contact</Link></li>
            </ul>
          </section>

          {/* Column 3: Services */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/40">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services/driveways" className="text-primary-foreground/70 hover:text-accent">Driveway Installation</Link></li>
              <li><Link href="/services/landscaping" className="text-primary-foreground/70 hover:text-accent">Landscaping</Link></li>
              <li><Link href="/services/masonry" className="text-primary-foreground/70 hover:text-accent">Masonry &amp; Patios</Link></li>
              <li><Link href="/services/property-maintenance" className="text-primary-foreground/70 hover:text-accent">Property Maintenance</Link></li>
            </ul>
            <div className="pt-2">
              <Button asChild size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/services">
                  Get a Free Quote <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </section>

          {/* Column 4: CTA + Pro Program */}
          <section className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/40">For Contractors</h3>
            <div className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-4">
              <p className="text-sm font-semibold">Pro Contractor Pricing</p>
              <p className="mt-1 text-xs text-primary-foreground/60">
                Volume discounts, priority scheduling, and dedicated account support for licensed contractors.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/contact">Apply for Pro Account</Link>
              </Button>
            </div>
            <div className="text-center">
              <Button asChild variant="outline" size="lg" className="w-full border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href={siteConfig.phoneHref}>
                  <Phone className="size-4" /> Call Now
                </a>
              </Button>
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-primary-foreground/40 sm:px-6 md:flex-row md:items-center md:justify-between">
            <p>&copy; {thisYear} Eastern Landscape &amp; Mason Supply. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy-policy" className="hover:text-primary-foreground/70">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary-foreground/70">Terms</Link>
              <span>Serving Suffolk County, Long Island</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
