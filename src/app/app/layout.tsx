import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-bulk-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-bulk-body",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-bulk-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Order Bulk Materials — Eastern Landscape & Mason Supply",
  description:
    "Order mulch, topsoil, gravel, stone, and sand for delivery across Suffolk County. Buy more, save more.",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Standalone layout for the /app bulk ordering experience.
 * Does NOT render Header, Footer, FloatingCart, or PromoPopup.
 * The (bulk-app) route group isolates this from the main site layout.
 */
export default function BulkAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} mx-auto min-h-screen max-w-[430px] bg-bulk-bg font-bulk-body text-bulk-text antialiased`}
    >
      {children}
    </div>
  );
}
