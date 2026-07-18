"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calculator, Menu, Phone, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartItemCount, useCartHydrated } from "@/stores/cartStore";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/shop/bulk", label: "Shop Materials", primary: true },
  { href: "/services", label: "Get a Quote", primary: true },
  { href: "/delivery", label: "Delivery Areas" },
  { href: "/calculator", label: "Material Calculator" },
  { href: "/contact", label: "Contact" },
];

const serviceLinks = [
  { href: "/services/driveways", label: "Driveways" },
  { href: "/services/landscaping", label: "Landscaping" },
  { href: "/services/masonry", label: "Masonry" },
  { href: "/services/property-maintenance", label: "Maintenance" },
  { href: "/tree-services", label: "Tree Services" },
];

export function MobileMenu() {
  const hydrated = useCartHydrated();
  const rawCount = useCartItemCount();
  const cartItemCount = hydrated ? rawCount : 0;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex size-11 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
          {cartItemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {Math.round(cartItemCount)}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>
            <Image src="/logo-elm-blue.webp" alt="Eastern Landscape & Mason Supply" width={160} height={45} />
          </SheetTitle>
          <SheetDescription className="sr-only">Navigation menu</SheetDescription>
        </SheetHeader>

        {/* Primary actions */}
        <div className="mt-6 space-y-2">
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg" onClick={close}>
            <Link href="/shop">
              <Truck className="size-4" /> Shop Materials
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg" onClick={close}>
            <Link href="/services">
              Get a Quote <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Cart */}
        {cartItemCount > 0 && (
          <Button asChild variant="outline" className="mt-3 w-full" onClick={close}>
            <Link href="/cart">
              <ShoppingCart className="size-4" />
              View Cart
              <Badge className="ml-auto h-5 min-w-5 justify-center rounded-full bg-accent px-1.5 text-[11px] text-accent-foreground" variant="secondary">
                {Math.round(cartItemCount)}
              </Badge>
            </Link>
          </Button>
        )}

        {/* Call + Text buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={siteConfig.phoneHref} className="flex items-center justify-center gap-2 rounded-xl border bg-primary/5 py-3.5 text-sm font-semibold text-primary">
            <Phone className="size-4" /> Call
          </a>
          <a href={siteConfig.smsHref} className="flex items-center justify-center gap-2 rounded-xl border bg-primary/5 py-3.5 text-sm font-semibold text-primary">
            💬 Text Us
          </a>
        </div>

        {/* Nav links — 52px touch targets */}
        <nav className="mt-5 space-y-0.5" aria-label="Mobile navigation">
          {navItems.filter((i) => !i.primary).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="flex items-center rounded-lg px-4 py-3.5 text-base font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Services submenu */}
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Services</p>
          {serviceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="flex items-center rounded-lg px-4 py-3 text-base text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Phone */}
        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="lg">
              <a href={siteConfig.phoneHref}>
                <Phone className="size-4" /> Call
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={siteConfig.smsHref}>Text Us</a>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">Mon-Fri 7-5 &middot; Sat 7-3</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
