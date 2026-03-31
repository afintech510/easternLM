/**
 * Design tokens mapping Stitch brand colors to Tailwind classes.
 * Reference for Phase 02a component implementation.
 *
 * Usage: className={tokens.bg.surface} → "bg-bulk-bg"
 */

export const tokens = {
  bg: {
    dark: "bg-bulk-dark",           // #0f1f0f — darkest green
    primary: "bg-bulk-primary",     // #1a2e1a — dark green
    medium: "bg-bulk-medium",       // #2d4a2d — medium green
    surface: "bg-bulk-bg",          // #FAFAF7 — warm cream
    card: "bg-bulk-card",           // #f0ede6 — warm off-white
    sage: "bg-bulk-sage",           // #8BC68B — sage green
    warn: "bg-bulk-warn-bg",        // #FFF8E1 — yellow
    premium: "bg-bulk-premium-bg",  // #FFF3E0 — orange tint
    bnpl: "bg-bulk-bnpl-bg",        // #f5f0ff — purple tint
  },
  text: {
    heading: "text-bulk-text",      // #1a2e1a
    body: "text-bulk-muted",        // #6b7c6b
    faded: "text-bulk-faded",       // #9a9a8e
    sage: "text-bulk-sage",         // #8BC68B
    warn: "text-bulk-warn-text",    // #5D4037
    premium: "text-bulk-premium-text", // #E65100
    bnpl: "text-bulk-bnpl-text",    // #5e35b1
  },
  border: {
    default: "border-bulk-border",  // #e2dfd8
    warn: "border-bulk-warn-border",// #FFE082
    bnpl: "border-bulk-bnpl-border",// #e0d6ff
  },
  font: {
    display: "font-bulk-display",   // Playfair Display
    body: "font-bulk-body",         // DM Sans
    mono: "font-bulk-mono",         // DM Mono
  },
} as const;
