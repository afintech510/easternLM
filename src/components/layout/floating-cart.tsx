"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore, useCartHydrated } from "@/stores/cartStore";

const HIDDEN_PATHS = ["/cart", "/checkout", "/admin", "/yard", "/field", "/pos", "/quote"];
const MIN_TOP = 12; // px from viewport top when scrolled down

export function FloatingCart() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const [bounce, setBounce] = useState(false);
  const [topPx, setTopPx] = useState<number | null>(null);
  const prevCount = useRef(totalQty);

  useEffect(() => {
    if (totalQty > prevCount.current) {
      setBounce(true);
      setTimeout(() => setBounce(false), 300);
    }
    prevCount.current = totalQty;
  }, [totalQty]);

  // Compute top position: below header when at top, slides to MIN_TOP as user scrolls
  useEffect(() => {
    function update() {
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 96;
      const restTop = headerH + 12; // resting position below header
      setTopPx(Math.max(MIN_TOP, restTop - window.scrollY));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (!hydrated || isHidden || items.length === 0) return null;

  const qtyDisplay = totalQty % 1 === 0 ? totalQty.toString() : totalQty.toFixed(1);
  const allBulk = items.every((i) => i.deliveryType === "bulk");
  const unitLabel = allBulk ? `${qtyDisplay} yd` : `${qtyDisplay} items`;

  return (
    <Link
      href="/cart"
      className={`fixed right-3 z-40 md:hidden
        flex items-center gap-2
        rounded-full bg-accent text-accent-foreground
        pl-4 pr-4 py-2.5
        shadow-lg shadow-black/20
        active:scale-95 transition-transform duration-200
        ${bounce ? "scale-110" : "scale-100"}`}
      style={{ top: topPx ?? 108, animation: "slideInRight 0.3s ease-out" }}
      aria-label={`View cart — ${unitLabel}`}
    >
      <ShoppingCart className="size-5" />
      <span className="text-sm font-bold">{unitLabel}</span>
    </Link>
  );
}
