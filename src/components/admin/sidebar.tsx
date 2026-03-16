"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Truck,
  Image as ImageIcon,
  Database,
  ArrowLeft,
  ClipboardList,
  Users,
  MessageSquare,
  Megaphone,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/operations", label: "Operations", icon: Activity },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/trucks", label: "Truck Fleet", icon: Truck },
  { href: "/admin/leads", label: "Service Leads", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/follow-ups", label: "Follow-Ups", icon: MessageSquare },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/cache", label: "Fee Cache", icon: Database },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card md:block">
      <Link href="/admin" className="block px-4 py-3 border-b border-border">
        <Image src="/logo-blue.png" alt="Eastern LM" width={140} height={37} />
      </Link>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Site
          </Link>
        </div>
      </ScrollArea>
    </aside>
  );
}
