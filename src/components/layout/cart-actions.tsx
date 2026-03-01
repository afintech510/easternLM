"use client";

import Link from "next/link";
import { Phone, ShoppingCart } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartItemCount } from "@/stores/cartStore";

export function CartActions() {
  const cartItemCount = useCartItemCount();

  return (
    <div className="hidden items-center gap-3 md:flex">
      <Button
        asChild
        variant="outline"
        className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
      >
        <a href={siteConfig.phoneHref}>
          <Phone className="size-4" />
          Call Now
        </a>
      </Button>
      <Button
        asChild
        className="relative bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Link href="/cart">
          <ShoppingCart className="size-4" />
          Cart
          <Badge
            className="ml-1 h-5 min-w-5 justify-center rounded-full bg-primary-foreground px-1.5 text-[11px] text-primary"
            variant="secondary"
          >
            {Math.round(cartItemCount)}
          </Badge>
        </Link>
      </Button>
    </div>
  );
}
