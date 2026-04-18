-- Instant-book landscape services table
-- Admin-managed catalog. Services can be hidden per season or marked inactive.

CREATE TABLE IF NOT EXISTS instant_book_services (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text UNIQUE NOT NULL,
  name               text NOT NULL,
  tagline            text,
  description        text,
  includes           jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon               text,
  category           text NOT NULL,
  packages           jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active          boolean NOT NULL DEFAULT true,
  is_featured        boolean NOT NULL DEFAULT false,
  sort_order         integer NOT NULL DEFAULT 0,
  season_start_month integer,
  season_end_month   integer,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instant_book_services_active ON instant_book_services (is_active, sort_order);

ALTER TABLE instant_book_services ENABLE ROW LEVEL SECURITY;

-- Public can read active services
CREATE POLICY "Public read active services" ON instant_book_services
  FOR SELECT USING (is_active = true);

-- Seed initial services
INSERT INTO instant_book_services (slug, name, tagline, description, includes, icon, category, packages, sort_order, is_featured) VALUES
  ('mulch-install', 'Mulch Installation',
   'We spread — you relax. Mulch delivered and installed by local crews.',
   'Our crew delivers mulch to your property and spreads it across your beds. Choose the amount that fits your yard.',
   '["Delivery of mulch","Spread across specified beds","Clean edges","Haul away any old mulch/debris (up to 1 cu yd)"]'::jsonb,
   'Sprout', 'install',
   '[{"name":"3 yards (small yard)","price_cents":22500,"unit":"flat","description":"Covers ~300 sq ft at 3\" depth"},{"name":"5 yards (medium yard)","price_cents":35000,"unit":"flat","description":"Covers ~500 sq ft at 3\" depth"},{"name":"10 yards (large yard)","price_cents":65000,"unit":"flat","description":"Covers ~1,000 sq ft at 3\" depth"}]'::jsonb,
   10, true),

  ('yard-cleanup', 'Yard Cleanup',
   'Spring clean, fall clean, or last-minute before the party — we dispatch a crew.',
   'Our 2-person crew tackles your yard: leaves, debris, overgrown beds, edging, and haul-away. Half day or full day.',
   '["2-person certified crew","Leaf & debris cleanup","Bed cleanup & edging","Debris haul-away (up to 2 cu yd)","Light pruning of shrubs","Lawn bag cleanup"]'::jsonb,
   'Leaf', 'cleanup',
   '[{"name":"Half Day (4 hours)","price_cents":45000,"unit":"flat"},{"name":"Full Day (8 hours)","price_cents":85000,"unit":"flat"},{"name":"Rush — Half Day (48hr turnaround)","price_cents":55000,"unit":"flat","description":"Last-minute cleanup before a party, event, or showing"},{"name":"Rush — Full Day (48hr turnaround)","price_cents":95000,"unit":"flat","description":"Priority scheduling for major cleanups"}]'::jsonb,
   20, true),

  ('topsoil-spreading', 'Topsoil Spreading',
   'Screened topsoil spread and graded. Materials separate or bundled.',
   'Professional grading for a new lawn, garden bed, or fill. Our crew spreads and levels topsoil to your spec.',
   '["2-person crew","Grading and leveling","Rake-ready finish","Up to 15 cu yd per day"]'::jsonb,
   'Mountain', 'install',
   '[{"name":"Per cu. yard (labor only)","price_cents":4500,"unit":"per_unit","description":"Labor to spread topsoil you''ve ordered. Minimum 3 yd."},{"name":"5 yd — labor + delivery bundled","price_cents":32500,"unit":"flat","description":"Topsoil + spreading, small lawns & beds"},{"name":"10 yd — labor + delivery bundled","price_cents":58000,"unit":"flat","description":"Topsoil + spreading, medium lawns"}]'::jsonb,
   30, false),

  ('gravel-driveway-topdress', 'Gravel Driveway Top-Dress',
   'Fresh gravel spread and rolled over your existing driveway.',
   'We refresh your gravel driveway with new stone spread evenly and rolled in. No grading included.',
   '["Delivery of 3/4\" gravel","Spread across driveway","Raked to crown","Light rolling for compaction"]'::jsonb,
   'CarFront', 'install',
   '[{"name":"Small driveway (up to 500 sq ft)","price_cents":35000,"unit":"flat"},{"name":"Medium driveway (500–1,000 sq ft)","price_cents":60000,"unit":"flat"},{"name":"Large driveway (1,000–2,000 sq ft)","price_cents":95000,"unit":"flat"}]'::jsonb,
   40, false),

  ('belgian-block-edging', 'Belgian Block Edging',
   'Clean, professional driveway edges installed in a day.',
   'Belgian block laid in concrete along your driveway edge. Sharpens the look and prevents wash-out.',
   '["Excavation of existing edge","Concrete base","Belgian block set & mortared","Backfill and cleanup"]'::jsonb,
   'Fence', 'install',
   '[{"name":"20 linear feet (starter)","price_cents":90000,"unit":"flat"},{"name":"40 linear feet (average)","price_cents":180000,"unit":"flat"},{"name":"60+ linear feet — Custom quote","price_cents":0,"unit":"quote","description":"Larger installs — we''ll send a custom quote"}]'::jsonb,
   50, false),

  ('driveway-apron', 'Driveway Apron',
   'The 10 ft at the bottom of your driveway — paved, cobblestoned, or bluestoned.',
   'Finish the entrance to your property with a defined apron. Cobblestone, Belgian block, or bluestone options.',
   '["Excavation","Gravel base","Decorative material set in concrete","Broom-finish transition to asphalt"]'::jsonb,
   'Home', 'install',
   '[{"name":"Starting at — custom quote","price_cents":85000,"unit":"quote","description":"Final price depends on width, material, and site conditions"}]'::jsonb,
   60, false),

  ('flagstone-pathway', 'Flagstone Pathway',
   'Natural bluestone or irregular flagstone — set on a proper base.',
   'A beautiful pathway through your garden or from driveway to door. Installed on compacted stone and polymeric sand.',
   '["Excavation (4\" deep)","Compacted stone base","Flagstone laid in sand","Polymeric sand joints","Edge-restrained"]'::jsonb,
   'Footprints', 'install',
   '[{"name":"Small path — up to 50 sq ft","price_cents":175000,"unit":"flat"},{"name":"Medium path — up to 100 sq ft","price_cents":350000,"unit":"flat"},{"name":"Larger — custom quote","price_cents":0,"unit":"quote"}]'::jsonb,
   70, false),

  ('gravel-pathway', 'Gravel Pathway',
   'Pea gravel or crushed stone path with steel or cobble edging.',
   'A simpler and more affordable pathway. Choose pea gravel for a soft look or crushed stone for a compacted finish.',
   '["Excavation (3\" deep)","Weed fabric","Compacted gravel","Steel edging","Clean finish"]'::jsonb,
   'Footprints', 'install',
   '[{"name":"Small — up to 50 sq ft","price_cents":75000,"unit":"flat"},{"name":"Medium — up to 100 sq ft","price_cents":150000,"unit":"flat"}]'::jsonb,
   80, false),

  ('garden-walls', 'Garden Walls',
   'Dry-laid or mortared stone walls for gardens, retaining, or decorative edges.',
   'Short walls (under 2 ft) built from natural stone or modular block. Retaining and decorative options.',
   '["Site prep & leveling","Base gravel","Stone laid to height","Capstones included","Backfill"]'::jsonb,
   'Wall', 'install',
   '[{"name":"10 ft dry-laid (under 2 ft tall)","price_cents":55000,"unit":"flat"},{"name":"20 ft dry-laid (under 2 ft tall)","price_cents":110000,"unit":"flat"},{"name":"Mortared / retaining — custom quote","price_cents":0,"unit":"quote"}]'::jsonb,
   90, false),

  ('power-washing', 'Power Washing',
   'Driveway, house, patio, deck — bring it back to clean.',
   'Professional power washing of concrete, pavers, siding, decks, and patios. Eco-friendly detergents available.',
   '["High-pressure wash","Surface cleaner for flat surfaces","Detergent pre-treatment","Water collection / containment","No damage to landscaping"]'::jsonb,
   'Droplets', 'washing',
   '[{"name":"Patio or walkway (up to 400 sq ft)","price_cents":25000,"unit":"flat"},{"name":"Driveway (standard size)","price_cents":35000,"unit":"flat"},{"name":"Full house + driveway","price_cents":65000,"unit":"flat"}]'::jsonb,
   100, false),

  ('paver-wash-sand', 'Paver Wash + Poly-Sanding',
   'Clean pavers + re-sand the joints — pavers look brand new again.',
   'Deep clean existing paver surfaces, remove old sand, and refill joints with polymeric sand to prevent weeds and ants.',
   '["Power wash to remove debris","Remove failing sand","Apply polymeric sand","Activate & cure","Protects from weeds, ants, shifting"]'::jsonb,
   'Grid3X3', 'washing',
   '[{"name":"Small — up to 500 sq ft","price_cents":65000,"unit":"flat"},{"name":"Medium — up to 1,000 sq ft","price_cents":110000,"unit":"flat"},{"name":"Large — up to 2,000 sq ft","price_cents":180000,"unit":"flat"}]'::jsonb,
   110, false)
ON CONFLICT (slug) DO NOTHING;

-- Add order_type column to orders to flag instant-book service bookings
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'materials';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS capture_method text DEFAULT 'automatic';
