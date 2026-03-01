"use client";

import Link from "next/link";
import { Menu, Phone, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartItemCount } from "@/stores/cartStore";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileMenu() {
  const cartItemCount = useCartItemCount();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="border-primary/20">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 border-primary/15">
        <SheetHeader className="text-left">
          <SheetTitle className="[font-family:var(--font-display)] text-primary">
            Eastern Landscape
          </SheetTitle>
          <SheetDescription>Supplies, services, and delivery support.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-2">
          {siteConfig.navLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              className="justify-start text-base"
              onClick={closeMenu}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          <Button asChild className="w-full" onClick={closeMenu}>
            <Link href="/cart">
              <ShoppingCart className="size-4" />
              View Cart
              <Badge
                className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]"
                variant="secondary"
              >
                {Math.round(cartItemCount)}
              </Badge>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-primary/20">
            <a href={siteConfig.phoneHref}>
              <Phone className="size-4" />
              {siteConfig.phoneDisplay}
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
