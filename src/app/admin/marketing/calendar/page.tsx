"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

interface CalendarSlot {
  day: string; platform: string; pillar: string; topic: string; time: string;
}
interface CalendarData {
  week_start: string;
  plan?: { slots?: CalendarSlot[] };
  status: string;
  rotation_warning?: boolean;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORMS = ["instagram_feed", "facebook_page", "google_business_profile"];
const PLATFORM_SHORT: Record<string, string> = {
  instagram_feed: "IG", facebook_page: "FB", google_business_profile: "GBP"
};

const PILLAR_COLORS: Record<string, string> = {
  product_showcase: "bg-amber-400", delivery_action: "bg-sky-400",
  seasonal_tips: "bg-emerald-400", before_after: "bg-purple-400",
  local_community: "bg-rose-400", promotions: "bg-orange-400",
  behind_scenes: "bg-gray-400",
};

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/calendar/current`).then(r => r.json()).then(d => {
      setCalendar(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Content Calendar</h1>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  const slots = calendar?.plan?.slots ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Week of {calendar?.week_start ?? "—"} · {slots.length} posts planned
          </p>
        </div>
      </div>

      {calendar?.rotation_warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-sm text-amber-800">Pillar rotation warning — some pillars may be over-represented.</p>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">No calendar generated yet. The first one generates automatically Monday at 5 AM.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm font-medium text-muted-foreground w-16">Day</th>
                {PLATFORMS.map(p => (
                  <th key={p} className="p-2 text-left text-sm font-medium text-muted-foreground">
                    {PLATFORM_SHORT[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => (
                <tr key={day} className="border-t">
                  <td className="p-2 text-sm font-medium">{DAY_LABELS[i]}</td>
                  {PLATFORMS.map(platform => {
                    const daySlots = slots.filter(s => s.day === day && s.platform === platform);
                    return (
                      <td key={platform} className="p-2">
                        {daySlots.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1">
                            {daySlots.map((slot, j) => (
                              <div key={j} className="flex items-start gap-1.5">
                                <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${PILLAR_COLORS[slot.pillar] ?? "bg-gray-300"}`} />
                                <span className="text-xs leading-tight">{slot.topic}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
