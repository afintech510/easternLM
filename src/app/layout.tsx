import type { Metadata } from "next";
import { Bree_Serif, Public_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { LayoutShell } from "@/components/layout/layout-shell";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const breeSerif = Bree_Serif({
  variable: "--font-display",
  weight: ["400"],
  subsets: ["latin"],
});

function resolveMetadataBase() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return new URL("http://localhost:3000");
  }

  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return new URL("http://localhost:3000");
    }
  }
}

export const metadata: Metadata = {
  title: "Eastern Landscape & Mason Supply",
  description:
    "Landscape and masonry supplies, local delivery, and professional services across Suffolk County.",
  metadataBase: resolveMetadataBase(),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Eastern Landscape & Mason Supply",
    description:
      "Landscape and masonry supplies, local delivery, and professional services across Suffolk County.",
    type: "website",
    siteName: "Eastern Landscape & Mason Supply",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eastern Landscape & Mason Supply",
    description:
      "Landscape and masonry supplies, local delivery, and professional services across Suffolk County.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${breeSerif.variable} antialiased`}>
        <LayoutShell footer={<Footer />}>{children}</LayoutShell>
        <Toaster position="top-right" richColors toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
