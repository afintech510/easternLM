"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { FeeTest } from "@/components/admin/settings/fee-test";
import { TruckList } from "@/components/admin/trucks/truck-list";
import { CacheList } from "@/components/admin/cache/cache-list";
import { StaffTab } from "@/components/admin/settings/staff-tab";

const TABS = [
  { key: "general", label: "General" },
  { key: "trucks", label: "Trucks" },
  { key: "cache", label: "Fee Cache" },
  { key: "staff", label: "Staff" },
  { key: "marketing", label: "Marketing" },
  { key: "operations", label: "Operations" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  initialTab: string;
  initialSettings: any;
  initialTrucks: any[];
  initialCacheEntries: any[];
  initialStaff: any[];
}

function TabContent({
  tab,
  initialSettings,
  initialTrucks,
  initialCacheEntries,
  initialStaff,
}: Props & { tab: TabKey }) {
  if (tab === "general") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {initialSettings ? (
            <SettingsForm initialSettings={initialSettings} />
          ) : (
            <p className="text-muted-foreground">Could not load settings.</p>
          )}
        </div>
        <FeeTest />
      </div>
    );
  }

  if (tab === "trucks") {
    return <TruckList initialTrucks={initialTrucks} />;
  }

  if (tab === "cache") {
    return <CacheList initialEntries={initialCacheEntries} />;
  }

  if (tab === "staff") {
    return <StaffTab initialStaff={initialStaff} />;
  }

  if (tab === "marketing") {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Marketing settings coming soon.
      </div>
    );
  }

  if (tab === "operations") {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Operations settings coming soon.
      </div>
    );
  }

  return null;
}

function SettingsTabsInner(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) ?? (props.initialTab as TabKey) ?? "general",
  );

  function selectTab(key: TabKey) {
    setActiveTab(key);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", key);
    router.replace(`/admin/settings?${params}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => selectTab(key)}
            className={`shrink-0 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-b-2 border-accent text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <TabContent tab={activeTab} {...props} />
    </div>
  );
}

// Suspense wrapper required for useSearchParams
export function SettingsTabs(props: Props) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <SettingsTabsInner {...props} />
    </Suspense>
  );
}
