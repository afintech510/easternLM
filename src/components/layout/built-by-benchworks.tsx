/**
 * Site-wide builder attribution strip. Rendered once (via LayoutShell) directly
 * below the main site footer on every public page — single source of truth.
 * Subtle, secondary-text builder credit (not a banner ad). Links to Benchworks.
 */
export function BuiltByBenchworks() {
  return (
    <div className="border-t border-border bg-background">
      <a
        href="https://benchworksai.com"
        target="_blank"
        rel="noopener"
        className="group mx-auto flex max-w-7xl flex-col items-center gap-x-3 gap-y-1 px-4 py-4 text-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:px-6 sm:text-[13px]"
      >
        <span className="font-semibold text-foreground/80 transition-colors group-hover:text-foreground">
          Built by Benchworks
        </span>
        <span className="max-w-prose">
          Custom platforms. AI tool coaching that multiplies your team&apos;s time.
        </span>
        <span className="tracking-wide text-muted-foreground/70">
          Advise &middot; Build &middot; Train &middot; Manage
        </span>
        <span className="font-medium text-foreground/70 transition-colors group-hover:text-accent">
          benchworksai.com
        </span>
      </a>
    </div>
  );
}
