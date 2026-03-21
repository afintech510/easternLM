"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

const HIDDEN_PATHS = ["/cart", "/checkout", "/admin", "/yard", "/field", "/pos", "/quote"];

export function FloatingCart() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemCount = items.length;

  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(totalQty);

  useEffect(() => {
    if (totalQty > prevCount.current) {
      setBounce(true);
      setTimeout(() => setBounce(false), 300);
    }
    prevCount.current = totalQty;
  }, [totalQty]);

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (isHidden || itemCount === 0) return null;

  return (
    <Link
      href="/cart"
      className={`fixed right-3 z-40 md:hidden
        top-[calc(var(--header-height,96px)+12px)]
        flex items-center gap-2
        rounded-full bg-accent text-accent-foreground
        pl-4 pr-3 py-2.5
        shadow-lg shadow-black/20
        active:scale-95 transition-transform duration-200
        ${bounce ? "scale-110" : "scale-100"}`}
      style={{ animation: "slideInRight 0.3s ease-out" }}
      aria-label={`View cart with ${Math.round(totalQty)} items`}
    >
      <span className="text-sm font-semibold">
        {Math.round(totalQty)} {totalQty === 1 ? "item" : "items"}
      </span>
      <div className="relative">
        <ShoppingCart className="size-5" />
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-white text-accent text-[10px] font-bold">
          {itemCount}
        </span>
      </div>
    </Link>
  );
}
