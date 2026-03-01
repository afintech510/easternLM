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
      <Button asChild variant="outline" className="border-primary/20">
        <a href={siteConfig.phoneHref}>
          <Phone className="size-4" />
          Call Now
        </a>
      </Button>
      <Button asChild variant="default" className="relative">
        <Link href="/cart">
          <ShoppingCart className="size-4" />
          Cart
          <Badge
            className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]"
            variant="secondary"
          >
            {Math.round(cartItemCount)}
          </Badge>
        </Link>
      </Button>
    </div>
  );
}
