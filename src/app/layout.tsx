import type { Metadata } from "next";
import { Bree_Serif, Public_Sans } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
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

export const metadata: Metadata = {
  title: "Eastern Landscape & Mason Supply",
  description:
    "Landscape and masonry supplies, local delivery, and professional services across Suffolk County.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${breeSerif.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
