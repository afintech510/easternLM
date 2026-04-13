import { Suspense } from "react";
import { CartPageClient } from "@/components/cart/cart-page-client";

export default function CartPage() {
  return (
    <Suspense>
      <CartPageClient />
    </Suspense>
  );
}
