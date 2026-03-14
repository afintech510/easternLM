# Eastern LM Design System

## Brand Identity

**Who we are:** A 30-year family-owned landscape and masonry supply yard in Center Moriches, NY. We sell bulk materials (mulch, stone, gravel, sand) and provide full-service installation (landscaping, masonry, driveways).

**Who our customers are:** Suffolk County contractors checking prices on dusty phones at job sites. Homeowners planning weekend projects. Property managers ordering recurring mulch deliveries.

**Design should feel:** Earthy. Solid. Trustworthy. Like the materials we sell — heavy, natural, real.

**Design should NOT feel:** Like a SaaS dashboard. Like an AI template. Like a tech startup.

---

## Color Palette

All colors use OKLCH for perceptual uniformity.

### Primary — Deep Navy-Teal (from logo)
Matches the Eastern LM logo blue (~#0d4f6b). Authoritative, professional, readable.
- `--primary`: oklch(0.28 0.07 230) — deep navy-teal (logo blue)
- `--primary-foreground`: oklch(0.98 0.005 75) — warm white

### Accent — Warm Amber/Gold
Calls to action, prices, badges. Visible on both dark and light backgrounds.
- `--accent`: oklch(0.68 0.16 70) — warm amber/gold
- `--accent-foreground`: oklch(0.18 0.03 50) — dark brown text on accent

### Backgrounds — Warm neutrals
Off-white with a warm (sandy) undertone. Never blue-gray.
- `--background`: oklch(0.975 0.006 75) — warm off-white (sandy)
- `--warm-bg`: oklch(0.955 0.01 75) — alternating section bg (warmer)
- `--card`: oklch(0.995 0.002 75) — card surfaces (near-white, warm)

### Text
- `--foreground`: oklch(0.18 0.02 50) — near-black, warm brown undertone
- `--muted-foreground`: oklch(0.48 0.02 60) — secondary text, warm gray

### Borders & Inputs
- `--border`: oklch(0.90 0.01 75) — warm light gray
- `--input`: oklch(0.91 0.01 75)

### Destructive
- `--destructive`: oklch(0.55 0.22 25) — construction red/orange

### Chart Colors (earthy spectrum)
1. Forest green (primary)
2. Warm brown (soil)
3. Stone gray
4. Sand/amber
5. Terracotta

---

## Typography

### Display — Bree Serif (var: --font-display)
Used for: h1, h2, section headings, hero text.
Character: Friendly but solid. Rounded serifs feel approachable without being fragile.
Weight: 400 only (Bree Serif's single weight is naturally bold-feeling).

### Body — Public Sans (var: --font-body)
Used for: paragraphs, labels, buttons, navigation.
Character: Clean geometric sans-serif with good readability at small sizes.
Weights: 400 (body), 500 (labels), 600 (buttons/emphasis), 700 (bold/prices).

### Scale
- xs: 0.75rem (12px) — labels, badges, metadata
- sm: 0.875rem (14px) — secondary body text, descriptions
- base: 1rem (16px) — primary body text
- lg: 1.125rem (18px) — large body, card titles
- xl: 1.25rem (20px) — section subheadings
- 2xl: 1.5rem (24px) — h3 equivalent
- 3xl: 1.875rem (30px) — h2
- 4xl: 2.25rem (36px) — h1
- 5xl: 3rem (48px) — hero headline (desktop)
- 6xl: 3.75rem (60px) — large hero (desktop only)

---

## Spacing

Base unit: 4px (0.25rem). Use Tailwind's default scale.
Section padding: py-12 (mobile), py-16/py-20 (desktop).
Card padding: p-5 or p-6.
Max content width: max-w-7xl (1280px).

---

## Border Radius

Slightly rounded, not pill-shaped. Materials are rough — corners shouldn't be bubbly.
- `--radius`: 0.625rem (10px) — base radius
- Cards: rounded-xl (12px)
- Buttons: rounded-lg (8px)
- Badges: rounded-md (6px)
- Inputs: rounded-md (6px)
- Hero sections: no radius (full-bleed)

---

## Shadows

Subtle, warm-toned. Not the default blue-gray Tailwind shadows.
- `shadow-sm`: 0 1px 2px oklch(0.3 0.02 60 / 0.06)
- `shadow-md`: 0 4px 6px oklch(0.3 0.02 60 / 0.08)
- `shadow-lg`: 0 10px 15px oklch(0.3 0.02 60 / 0.10)
- Hover elevation: transition from shadow-none to shadow-md

---

## Component Patterns

### Buttons
- Primary: bg-accent, text-accent-foreground, hover:bg-accent/90
- Secondary: bg-primary, text-primary-foreground
- Outline: border-border, hover:bg-muted
- Ghost: text-foreground, hover:bg-muted
- All: font-semibold, rounded-lg, h-10 (default), h-12 (lg)

### Cards
- bg-card, border, rounded-xl, p-5 or p-6
- Hover: border-accent/30, shadow-md, transition-all
- No background gradient — flat, clean

### Hero Sections
- bg-primary (dark forest green), full-bleed
- topo-pattern overlay for texture
- Text: primary-foreground (warm white)
- Accent badge/pill above headline

### Product Cards
- Image: h-48, object-cover, rounded-t-xl
- Body: p-5, category label (xs, uppercase, tracking-wide, muted)
- Price: text-accent, font-bold, text-lg
- Two CTAs: View Details (outline) + Add to Cart (accent)

### Trust Signals
- Icons: text-accent (warm amber on green backgrounds)
- Text: text-sm, font-medium
- Layout: flex, gap-4, items-center

---

## Photography Direction

Until real product photos are available:
- Fallback: Unsplash landscape/construction materials
- Style: Natural lighting, outdoor, earthy textures
- Avoid: Studio white backgrounds, stock photo people, AI-generated images

---

## Responsive Breakpoints

Follow Tailwind defaults:
- sm: 640px (tablet portrait)
- md: 768px (tablet landscape)
- lg: 1024px (desktop)
- xl: 1280px (wide desktop)

Mobile-first. Contractors on phones at job sites are the primary audience.

---

## Anti-Patterns (DO NOT)

- Purple, bright blue, or neon colors
- Thin/light font weights for headings
- Glassmorphism or frosted glass effects
- Gradient backgrounds on cards
- Rounded-full on rectangular elements (except pills/badges)
- Dark mode (not needed for this audience)
- Animation for animation's sake
- Drop shadows with blue undertones
