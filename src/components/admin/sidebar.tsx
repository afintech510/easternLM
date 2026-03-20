"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Users,
  FileText,
  Megaphone,
  Bell,
  Camera,
  Package,
  Truck,
  HardHat,
  Wrench,
  Tag,
  Table2,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  Upload,
  Factory,
  ArrowRightLeft,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickQuoteSidebarButton } from "@/components/admin/quick-quote";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  badgeKey?: "orders" | "followUps" | "invoices";
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: "Sales",
    items: [
      { label: "Dashboard", href: "/admin", icon: BarChart3, exact: true },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Quotes", href: "/admin/quotes", icon: FileText },
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
      { label: "Leads", href: "/admin/leads", icon: Bell, badgeKey: "followUps" },
      { label: "Contractors", href: "/admin/contractors", icon: Users },
      { label: "Follow-Ups", href: "/admin/follow-ups", icon: Bell },
      { label: "Gallery", href: "/admin/gallery", icon: Camera },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders", href: "/admin/operations", icon: Package, badgeKey: "orders" },
      { label: "Dispatch", href: "/admin/operations/dispatch", icon: Truck },
      { label: "Projects", href: "/admin/projects", icon: HardHat },
      { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Tag },
      { label: "Bulk Editor", href: "/admin/products/bulk", icon: Table2 },
      { label: "Inventory", href: "/admin/inventory", icon: Package },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", href: "/admin/invoices", icon: Receipt, badgeKey: "invoices" },
      { label: "Charge Accounts", href: "/admin/accounts", icon: CreditCard },
      { label: "Statements", href: "/admin/statements", icon: FileSpreadsheet },
      { label: "Upload (OCR)", href: "/admin/invoices/upload", icon: Upload },
      { label: "Scan (Mobile)", href: "/yard/scan", icon: Camera },
      { label: "Suppliers", href: "/admin/suppliers", icon: Factory },
      { label: "Transactions", href: "/admin/transactions", icon: ArrowRightLeft },
    ],
  },
];

interface Badges {
  orders: number;
  followUps: number;
  invoices: number;
}

function useBadges() {
  const [badges, setBadges] = useState<Badges>({ orders: 0, followUps: 0, invoices: 0 });

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/badges");
      if (res.ok) setBadges(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchBadges();

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-badges")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, fetchBadges)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, fetchBadges)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follow_ups" },
        fetchBadges,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBadges]);

  return badges;
}

// ── Nav items shared between sidebar and mobile sheet ─────────────

function NavLink({
  item,
  badge,
  onClick,
}: {
  item: NavItem;
  badge: number;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent/20 font-medium text-accent"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SidebarSections({
  badges,
  onNavigate,
}: {
  badges: Badges;
  onNavigate?: () => void;
}) {
  // Persist collapse state per section
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("admin-sidebar-collapsed") ?? "{}");
    } catch {
      return {};
    }
  });

  function toggleSection(label: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="space-y-1">
      {SECTIONS.map((section) => {
        const isCollapsed = collapsed[section.label];
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left"
            >
              <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.label}
              </span>
              {isCollapsed ? (
                <ChevronRight className="size-3 text-zinc-700" />
              ) : (
                <ChevronDown className="size-3 text-zinc-700" />
              )}
            </button>

            {!isCollapsed && (
              <div className="space-y-0.5 pb-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    badge={item.badgeKey ? badges[item.badgeKey] : 0}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────

export function AdminSidebar() {
  const router = useRouter();
  const badges = useBadges();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      {/* Logo + POS link */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Link href="/admin">
          <Image
            src="/logo-blue.png"
            alt="Eastern LM"
            width={120}
            height={32}
            className="brightness-0 invert opacity-80"
          />
        </Link>
        <Link
          href="/yard/register"
          target="_blank"
          title="Open POS Register"
          className="transition-transform hover:scale-110"
          style={{ filter: "drop-shadow(0 0 4px #39ff14) drop-shadow(0 0 8px #39ff1466)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
            <path fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M 75 24 L 83 24 C 85 24, 86 25, 86 27 L 86 38 C 86 40, 85 41, 83 41 L 75 41" />
            <path fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M 41 57 L 38 72 M 53 57 L 55 68" />
            <path fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M 38 72 L 23 72 C 18 72, 16 74, 16 78 L 16 84 C 16 87, 18 88, 21 88 L 54 88" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="16" y1="79" x2="52" y2="79" />
            <rect fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" x="52" y="65" width="34" height="23" rx="4" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="59" y1="73" x2="64" y2="73" />
            <circle fill="#39ff14" cx="79" cy="73" r="2.2" />
            <circle fill="#39ff14" cx="60" cy="81" r="2.2" />
            <circle fill="#39ff14" cx="67" cy="81" r="2.2" />
            <circle fill="#39ff14" cx="74" cy="81" r="2.2" />
            <path fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M 48 10 L 21 10 C 16 10, 14 12, 14 17 L 14 50 C 14 55, 16 57, 21 57 L 69 57 C 74 57, 76 55, 76 50 L 76 17 C 76 12, 74 10, 69 10 L 61 10" />
            <circle fill="#39ff14" cx="55" cy="10" r="2.2" />
            <rect fill="none" stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" x="24" y="19" width="42" height="29" rx="1.5" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="31" y1="25" x2="51" y2="25" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="31" y1="32" x2="51" y2="32" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="31" y1="39" x2="35" y2="39" />
            <line stroke="#39ff14" strokeWidth="4.5" strokeLinecap="round" x1="54" y1="42" x2="63" y2="42" />
          </svg>
        </Link>
      </div>

      {/* Quick Quote */}
      <div className="px-2 pt-3 pb-1">
        <QuickQuoteSidebarButton />
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        <SidebarSections badges={badges} />
      </div>

      {/* Bottom: settings + sign out */}
      <div className="border-t border-zinc-800 p-2 space-y-0.5">
        <Link
          href="/admin/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Mobile trigger (used in AdminHeader) ──────────────────────────

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const badges = useBadges();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-zinc-950 border-zinc-800">
        <SheetTitle className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <Image
            src="/logo-blue.png"
            alt="Eastern LM"
            width={100}
            height={28}
            className="brightness-0 invert opacity-80"
          />
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X className="size-4" />
          </button>
        </SheetTitle>

        <div className="flex h-[calc(100vh-3.5rem)] flex-col">
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <SidebarSections badges={badges} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-zinc-800 p-2 space-y-0.5">
            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
