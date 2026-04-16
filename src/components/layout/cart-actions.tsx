"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Phone, ShoppingCart } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartItemCount, useCartHydrated } from "@/stores/cartStore";

export function CartActions() {
  const hydrated = useCartHydrated();
  const rawCount = useCartItemCount();
  const cartItemCount = hydrated ? rawCount : 0;
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(cartItemCount);

  useEffect(() => {
    if (cartItemCount > prevCount.current) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 400);
      return () => clearTimeout(timer);
    }
    prevCount.current = cartItemCount;
  }, [cartItemCount]);

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-foreground/70 hover:text-foreground"
      >
        <a href={siteConfig.phoneHref}>
          <Phone className="size-4" />
          <span className="hidden xl:inline">Call</span>
        </a>
      </Button>
      <Button
        asChild
        size="sm"
        className="relative bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Link href="/cart">
          <span className={`inline-flex transition-transform duration-300 ${bounce ? "scale-125" : "scale-100"}`}>
            <ShoppingCart className="size-4" />
          </span>
          Cart
          {cartItemCount > 0 && (
            <Badge
              className={`ml-1 h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground transition-transform duration-300 ${bounce ? "scale-110" : "scale-100"}`}
              variant="secondary"
            >
              {Math.round(cartItemCount)}
            </Badge>
          )}
        </Link>
      </Button>
    </div>
  );
}
