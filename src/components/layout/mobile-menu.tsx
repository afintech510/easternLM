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
        <Button
          size="icon"
          variant="ghost"
          className="text-foreground/70 hover:bg-muted hover:text-foreground"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader className="text-left">
          <SheetTitle className="[font-family:var(--font-display)] text-xl text-primary">
            Eastern LM
          </SheetTitle>
          <SheetDescription>Landscape & Mason Supply</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1">
          {siteConfig.navLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              className="justify-start text-base font-medium"
              onClick={closeMenu}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={closeMenu}>
            <Link href="/cart">
              <ShoppingCart className="size-4" />
              View Cart
              {cartItemCount > 0 && (
                <Badge
                  className="ml-1 h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground"
                  variant="secondary"
                >
                  {Math.round(cartItemCount)}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
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
