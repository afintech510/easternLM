-- Add granular visibility flags for web store vs POS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS visible_web boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_pos boolean NOT NULL DEFAULT true;

-- Migrate existing data: match is_active
UPDATE public.products SET visible_web = is_active, visible_pos = is_active;

-- Index for web store queries (most common)
CREATE INDEX IF NOT EXISTS idx_products_visible_web
  ON public.products(visible_web) WHERE visible_web = true;

-- Set POS-only for tools, chemicals, and yard-services categories
UPDATE public.products
SET visible_web = false, visible_pos = true
WHERE category_id IN (
  SELECT id FROM public.categories
  WHERE slug IN ('tools', 'chemicals', 'rentals-services')
)
AND delivery_type = 'non-bulk';

-- Hide specific products from web by name pattern
UPDATE public.products
SET visible_web = false, visible_pos = true
WHERE name ILIKE '%propane%'
   OR name ILIKE '%dump trailer%'
   OR name ILIKE '%dumping%'
   OR name ILIKE '%firewood%'
   OR name ILIKE '%custom-item%'
   OR name ILIKE '%shrinkwrap%'
   OR name ILIKE '%tie wire%'
   OR name ILIKE '%safety glasses%'
   OR name ILIKE '%expansion joint%'
   OR name ILIKE '%wire lath%'
   OR name ILIKE '%pallet deposit%';
