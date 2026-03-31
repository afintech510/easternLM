-- Seed 16 bulk-app products with pricing from Adam's CSV + spec metadata
-- Row 1: Soil & Compost
UPDATE products SET ceiling_price_cents=2500, floor_price_cents=1800, floor_qty=20, default_depth_inches=3, pair_position='A', pair_slug='compost-certified-organic-rich-in-nutrients', row_order=1, category_tag='Soil & Compost', local_badge='Locally sourced', depth_helper_text='3-4" for new lawns, 2" for top-dressing', is_bulk_app_enabled=true WHERE slug='topsoil-screened-organic';
UPDATE products SET ceiling_price_cents=3400, floor_price_cents=2200, floor_qty=20, default_depth_inches=3, pair_position='B', pair_slug='topsoil-screened-organic', row_order=1, category_tag='Soil & Compost', local_badge='Locally sourced', depth_helper_text='2-3" as soil amendment or garden bed topping', is_bulk_app_enabled=true WHERE slug='compost-certified-organic-rich-in-nutrients';

-- Row 2: Mulch (Jet Black + Natural)
UPDATE products SET ceiling_price_cents=3400, floor_price_cents=2800, floor_qty=20, default_depth_inches=3, pair_position='A', pair_slug='dark-natural-mulch', row_order=2, category_tag='Mulch', local_badge='Processed locally', depth_helper_text='3" is the industry standard for weed suppression & moisture retention', premium_upgrade='{"label":"Triple-Shredded","minQty":20,"priceDeltaCents":800,"badge":"PREMIUM"}'::jsonb, is_bulk_app_enabled=true WHERE slug='black-mulch';
UPDATE products SET ceiling_price_cents=2600, floor_price_cents=1600, floor_qty=20, default_depth_inches=3, pair_position='B', pair_slug='black-mulch', row_order=2, category_tag='Mulch', local_badge='Locally sourced', depth_helper_text='3" is the industry standard for weed suppression & moisture retention', premium_upgrade='{"label":"Triple-Shredded","minQty":20,"priceDeltaCents":800,"badge":"PREMIUM"}'::jsonb, is_bulk_app_enabled=true WHERE slug='dark-natural-mulch';

-- Row 3: Mulch (Chocolate + Red)
UPDATE products SET ceiling_price_cents=4000, floor_price_cents=2600, floor_qty=20, default_depth_inches=3, pair_position='A', pair_slug='red-mulch', row_order=3, category_tag='Mulch', local_badge='Processed locally', depth_helper_text='3" is the industry standard for weed suppression & moisture retention', is_bulk_app_enabled=true WHERE slug='chocolate-mulch';
UPDATE products SET ceiling_price_cents=4200, floor_price_cents=3200, floor_qty=20, default_depth_inches=3, pair_position='B', pair_slug='chocolate-mulch', row_order=3, category_tag='Mulch', local_badge='Processed locally', depth_helper_text='3" is the industry standard for weed suppression & moisture retention', is_bulk_app_enabled=true WHERE slug='red-mulch';

-- Row 4: Recycled Aggregate
UPDATE products SET ceiling_price_cents=3200, floor_price_cents=2000, floor_qty=20, default_depth_inches=4, pair_position='A', pair_slug='regular-rca-blend-of-concrete-brick-and-blacktop', row_order=4, category_tag='Recycled Aggregate', depth_helper_text='4" provides a stable, well-draining base', is_bulk_app_enabled=true WHERE slug='state-grade-rca-95-concrete-made-to-spec-not-certified';
UPDATE products SET ceiling_price_cents=2600, floor_price_cents=1400, floor_qty=20, default_depth_inches=4, pair_position='B', pair_slug='state-grade-rca-95-concrete-made-to-spec-not-certified', row_order=4, category_tag='Recycled Aggregate', depth_helper_text='4" provides a stable, well-draining base', is_bulk_app_enabled=true WHERE slug='regular-rca-blend-of-concrete-brick-and-blacktop';

-- Row 5: LI Gravel
UPDATE products SET ceiling_price_cents=9000, floor_price_cents=6500, floor_qty=20, default_depth_inches=4, pair_position='A', pair_slug='34-inch-wash-gravel', row_order=5, category_tag='Long Island Gravel', local_badge='Locally sourced', depth_helper_text='2" decorative, 4" functional base', is_bulk_app_enabled=true WHERE slug='3-8-inch-pea-gravel';
UPDATE products SET ceiling_price_cents=9000, floor_price_cents=6500, floor_qty=20, default_depth_inches=4, pair_position='B', pair_slug='3-8-inch-pea-gravel', row_order=5, category_tag='Long Island Gravel', local_badge='Locally sourced', depth_helper_text='4" provides a stable drainage layer', crushed_upgrade='{"label":"Crushed","priceDeltaCents":500}'::jsonb, is_bulk_app_enabled=true WHERE slug='34-inch-wash-gravel';

-- Row 6: Crushed Stone
UPDATE products SET ceiling_price_cents=9500, floor_price_cents=7000, floor_qty=20, default_depth_inches=4, pair_position='A', pair_slug='34-inch-whitestone', row_order=6, category_tag='Crushed Stone', origin_story='From the mountains of upstate NY', depth_helper_text='4" provides a stable, well-draining base layer', is_bulk_app_enabled=true WHERE slug='38-inch-bluestone';
UPDATE products SET ceiling_price_cents=14500, floor_price_cents=11000, floor_qty=20, default_depth_inches=4, pair_position='B', pair_slug='38-inch-bluestone', row_order=6, category_tag='Crushed Stone', depth_helper_text='4" provides a stable, well-draining base layer', is_bulk_app_enabled=true WHERE slug='34-inch-whitestone';

-- Row 7: Decorative Stone
UPDATE products SET ceiling_price_cents=14500, floor_price_cents=11000, floor_qty=20, default_depth_inches=2, pair_position='A', pair_slug='38-inch-burgundy-red-stone', row_order=7, category_tag='Decorative Stone', depth_helper_text='2" for decorative coverage', is_bulk_app_enabled=true WHERE slug='small-pocono-river-rock-58-inch-1-inch-1';
UPDATE products SET ceiling_price_cents=12000, floor_price_cents=9000, floor_qty=20, default_depth_inches=2, pair_position='B', pair_slug='small-pocono-river-rock-58-inch-1-inch-1', row_order=7, category_tag='Decorative Stone', depth_helper_text='2" for decorative coverage', is_bulk_app_enabled=true WHERE slug='38-inch-burgundy-red-stone';

-- Row 8: Sand
UPDATE products SET ceiling_price_cents=6800, floor_price_cents=4800, floor_qty=20, default_depth_inches=1, pair_position='A', pair_slug='fine-sand', row_order=8, category_tag='Sand', local_badge='Locally sourced', depth_helper_text='Depth varies by application', application_quick_selects='[{"label":"Paver Base","defaultDepthInches":1,"helperText":"1\" leveling layer for paver installation"},{"label":"Pool Base","defaultDepthInches":2,"helperText":"2\" sand bed for above-ground pool"},{"label":"Playground","defaultDepthInches":6,"helperText":"6\" minimum for fall protection (CPSC)"},{"label":"Sports","defaultDepthInches":4,"helperText":"4\" for volleyball courts and horseshoe pits"}]'::jsonb, is_bulk_app_enabled=true WHERE slug='state-concrete-sand';
UPDATE products SET ceiling_price_cents=6800, floor_price_cents=4800, floor_qty=20, default_depth_inches=1, pair_position='B', pair_slug='state-concrete-sand', row_order=8, category_tag='Sand', local_badge='Locally sourced', depth_helper_text='Depth varies by application', application_quick_selects='[{"label":"Paver Base","defaultDepthInches":1,"helperText":"1\" leveling layer for paver installation"},{"label":"Pool Base","defaultDepthInches":2,"helperText":"2\" sand bed for above-ground pool"},{"label":"Playground","defaultDepthInches":6,"helperText":"6\" minimum for fall protection (CPSC)"},{"label":"Sports","defaultDepthInches":4,"helperText":"4\" for volleyball courts and horseshoe pits"}]'::jsonb, is_bulk_app_enabled=true WHERE slug='fine-sand';

-- Product sizes for stones with variants
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '3/8"', '3-8', 0, 1 FROM products WHERE slug='38-inch-bluestone'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '3/4"', '3-4', 0, 2 FROM products WHERE slug='38-inch-bluestone'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '1/2"', '1-2', 0, 1 FROM products WHERE slug='34-inch-whitestone'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '3/4"', '3-4', 0, 2 FROM products WHERE slug='34-inch-whitestone'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '1/2"-1 1/4"', 'small', 0, 1 FROM products WHERE slug='small-pocono-river-rock-58-inch-1-inch-1'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '1 1/2"-3"', 'large', 0, 2 FROM products WHERE slug='small-pocono-river-rock-58-inch-1-inch-1'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '3/8"', '3-8', 0, 1 FROM products WHERE slug='38-inch-burgundy-red-stone'
ON CONFLICT DO NOTHING;
INSERT INTO product_sizes (product_id, label, slug, price_delta_cents, sort_order)
SELECT id, '3/4"', '3-4', 0, 2 FROM products WHERE slug='38-inch-burgundy-red-stone'
ON CONFLICT DO NOTHING;
