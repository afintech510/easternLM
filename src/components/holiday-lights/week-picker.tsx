"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

export type InstallWeek = {
  id: string;
  label: string;
  weekStart: string;
  remaining: number;
  capacity: number;
};

type WeeksResponse = { weeks: InstallWeek[] };

/** Fetches install weeks from GET /api/holiday-lights/weeks. Exposes a retry. */
export function useInstallWeeks() {
  const [weeks, setWeeks] = useState<InstallWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/holiday-lights/weeks", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Couldn't load install weeks.");
      setWeeks((data as WeeksResponse).weeks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load install weeks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { weeks, loading, error, retry: load };
}

/**
 * Radio grid of install-week chips. Self-contained (props only) so it can be reused
 * in Build & Book and in the reserve dialog.
 */
export function WeekPicker({
  value,
  onChange,
  weeks,
  loading,
  error,
  onRetry,
}: {
  value: string;
  onChange: (id: string) => void;
  weeks: InstallWeek[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent) {
    const selectable = weeks.filter((w) => w.remaining > 0);
    if (selectable.length === 0) return;
    const ids = weeks.map((w) => w.id);
    const i = ids.indexOf(value);
    let next = i;
    const step = (dir: 1 | -1) => {
      let n = i;
      for (let c = 0; c < weeks.length; c++) {
        n = (n + dir + weeks.length) % weeks.length;
        if (weeks[n].remaining > 0) return n;
      }
      return i;
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = step(1);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = step(-1);
    if (next === i) return;
    e.preventDefault();
    onChange(ids[next]);
    refs.current[next]?.focus();
  }

  if (loading) {
    return (
      <p className="fine" role="status">
        Loading install weeks…
      </p>
    );
  }

  if (error) {
    return (
      <div>
        <p className="err">{error}</p>
        {onRetry && (
          <button type="button" className="btn btn-out" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div>
        <p className="err">No install weeks are open right now.</p>
        {onRetry && (
          <button type="button" className="btn btn-out" onClick={onRetry}>
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="weekgrid" role="radiogroup" aria-label="Pick your install week" onKeyDown={onKey}>
      {weeks.map((w, i) => {
        const full = w.remaining <= 0;
        const low = !full && w.remaining <= 3;
        return (
          <button
            key={w.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            className="weekchip"
            role="radio"
            aria-checked={w.id === value}
            aria-disabled={full}
            disabled={full}
            tabIndex={w.id === value ? 0 : -1}
            onClick={() => !full && onChange(w.id)}
          >
            <span className="weekchip-label">{w.label}</span>
            <span className={low ? "weekchip-spots low" : "weekchip-spots"}>
              {full ? "Full" : low ? `Only ${w.remaining} left` : `${w.remaining} spots left`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
