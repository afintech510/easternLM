-- Book-a-Crew v2 — simpler pricing schema for Smart Quote builder
-- Drops the old packages/includes structure in favor of rate-based pricing
-- that feeds into client-side quote calculation.

-- Add new pricing column (JSONB with base_cents, per_unit_cents, min_total_cents, flat_cents, tiers)
ALTER TABLE instant_book_services ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Clear old seed rows before reseeding
DELETE FROM instant_book_services WHERE slug IN (
  'mulch-install','yard-cleanup','topsoil-spreading','gravel-driveway-topdress',
  'belgian-block-edging','driveway-apron','flagstone-pathway','gravel-pathway',
  'garden-walls','power-washing','paver-wash-sand'
);

-- Reseed with rate-based pricing
INSERT INTO instant_book_services (slug, name, tagline, description, category, pricing, is_active, is_featured, sort_order) VALUES

  -- Mulch: base truck fee + $65/bed × depth multiplier
  ('mulch-install', 'Mulch Installation',
   'Delivered and spread across your beds.',
   'Local crew delivers mulch and spreads it across your beds. Tell us how many beds and how deep.',
   'install',
   '{"base_cents":10000,"per_unit_cents":6500,"min_total_cents":18000}'::jsonb,
   true, true, 10),

  -- Yard Cleanup: tiered by scope
  ('yard-cleanup', 'Yard Cleanup',
   'Leaves, debris, overgrown beds — gone.',
   'A 2-person crew handles your yard from top to bottom. Pick how big a job it is.',
   'cleanup',
   '{"tiers":{"half_day":45000,"full_day":85000,"two_day":155000}}'::jsonb,
   true, true, 20),

  -- Topsoil: base + $4,500/yd
  ('topsoil-spreading', 'Topsoil Spreading',
   'Screened topsoil spread and graded.',
   'Professional grading for a new lawn or bed. We spread and level to your spec.',
   'install',
   '{"base_cents":10000,"per_unit_cents":4500,"min_total_cents":22500}'::jsonb,
   true, false, 30),

  -- Gravel top-dress: tiered by driveway size
  ('gravel-driveway-topdress', 'Gravel Driveway Top-Dress',
   'Fresh gravel spread, raked, and rolled.',
   'Refresh your gravel driveway with a layer of new stone.',
   'install',
   '{"tiers":{"small":35000,"medium":60000,"large":95000}}'::jsonb,
   true, false, 40),

  -- Belgian block: $4,500/linear ft, $90k minimum
  ('belgian-block-edging', 'Belgian Block Edging',
   'Clean driveway edges, installed in a day.',
   'Belgian block laid in concrete along your driveway edge. Sharp, durable, and stops wash-out.',
   'install',
   '{"base_cents":0,"per_unit_cents":4500,"min_total_cents":90000}'::jsonb,
   true, false, 50),

  -- Driveway apron: quote only
  ('driveway-apron', 'Driveway Apron',
   'The 10-ft finish at the foot of your driveway.',
   'Cobblestone, Belgian block, or bluestone apron. Custom quote.',
   'install',
   '{}'::jsonb,
   true, false, 60),

  -- Flagstone pathway: $3,500/sq ft
  ('flagstone-pathway', 'Flagstone Pathway',
   'Natural bluestone path, set on a proper base.',
   'A beautiful pathway on compacted stone with polymeric sand joints.',
   'install',
   '{"base_cents":30000,"per_unit_cents":3500,"min_total_cents":150000}'::jsonb,
   true, false, 70),

  -- Gravel pathway: $1,500/sq ft
  ('gravel-pathway', 'Gravel Pathway',
   'Pea gravel path with clean edging.',
   'Simpler and more affordable pathway. Steel-edged, weed-fabric base.',
   'install',
   '{"base_cents":15000,"per_unit_cents":1500,"min_total_cents":55000}'::jsonb,
   true, false, 80),

  -- Garden walls: $3,500/linear ft × height factor
  ('garden-walls', 'Garden Walls',
   'Dry-laid stone walls, built to last.',
   'Natural stone or modular block walls. Retaining or decorative.',
   'install',
   '{"base_cents":10000,"per_unit_cents":3500,"min_total_cents":45000}'::jsonb,
   true, false, 90),

  -- Power washing: tiered by target
  ('power-washing', 'Power Washing',
   'Driveway, house, patio — bring it back to new.',
   'Professional power washing of concrete, pavers, siding, and decks.',
   'washing',
   '{"tiers":{"patio":25000,"driveway":35000,"full_house":65000}}'::jsonb,
   true, false, 100),

  -- Paver wash + sand: tiered by size
  ('paver-wash-sand', 'Paver Wash + Poly-Sand',
   'Pavers look brand new — weeds stay gone.',
   'Deep clean your pavers and refill joints with polymeric sand.',
   'washing',
   '{"tiers":{"small":65000,"medium":110000,"large":180000}}'::jsonb,
   true, false, 110);

-- Drop the old columns we no longer use (includes, packages) — keep them for now but nothing reads them
-- ALTER TABLE instant_book_services DROP COLUMN IF EXISTS packages;
-- ALTER TABLE instant_book_services DROP COLUMN IF EXISTS includes;
