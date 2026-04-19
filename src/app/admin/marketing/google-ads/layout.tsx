"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/marketing/google-ads", label: "Overview" },
  { href: "/admin/marketing/google-ads/feed", label: "Product Feed" },
  { href: "/admin/marketing/google-ads/campaigns", label: "Campaigns" },
  { href: "/admin/marketing/google-ads/recommendations", label: "Recommendations" },
  { href: "/admin/marketing/google-ads/conversions", label: "Conversions" },
  { href: "/admin/marketing/google-ads/designer", label: "AI Designer" },
];

export default function GoogleAdsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
