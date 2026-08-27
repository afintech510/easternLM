-- Driveway Sealcoating + Crack Repair — instant-book services
-- Adds the premium tiered sealcoat plus two crack-fill add-ons that the
-- /driveway-seal-coating-crack-repair landing page funnels into the existing
-- Book-a-Crew flow (auth-hold now, fixed $199 booking fee captured on confirm).
--
-- Pricing (cents) is admin-editable in the instant_book_services.pricing JSONB.
--   driveway-sealcoating: tiered by driveway size
--   driveway-crackfill-minor / -major: flat add-ons (major caps our exposure;
--     scope beyond the cap routes to a paid inspection — see landing copy).

DELETE FROM instant_book_services WHERE slug IN (
  'driveway-sealcoating', 'driveway-crackfill-minor', 'driveway-crackfill-major'
);

INSERT INTO instant_book_services
  (slug, name, tagline, description, category, pricing, is_active, is_featured, sort_order, season_start_month, season_end_month)
VALUES
  -- Premium 2-coat commercial-grade sealcoat, tiered by driveway size
  ('driveway-sealcoating', 'Premium Driveway Sealcoat',
   'Two-coat commercial-grade sealcoat. Booked online, scheduled within 2 weeks.',
   'Hand-cut edges, crack clean-out, and two coats of commercial-grade asphalt sealer. Locally sourced and applied by a vetted crew. Price locked at booking — we inspect to confirm before any non-refundable fee.',
   'sealcoating',
   '{"base_cents":0,"tiers":{"small":39900,"standard":65000,"large":89900}}'::jsonb,
   true, true, 5, 4, 11),

  -- Minor crack fill add-on (hairline–1/2")
  ('driveway-crackfill-minor', 'Minor Crack Fill',
   'Hot-rubber fill for hairline to 1/2" cracks.',
   'Clean-out and hot-applied rubberized crack filler for typical surface cracks before sealing.',
   'sealcoating',
   '{"flat_cents":10000}'::jsonb,
   true, false, 6, 4, 11),

  -- Major crack fill / hot-patch add-on (capped scope)
  ('driveway-crackfill-major', 'Major Crack Fill / Hot-Patch',
   'For wide cracks, alligatoring, and potholes. Includes up to 150 linear ft of cracks or 40 sq ft of hot-patch.',
   'Routed and hot-filled wide cracks plus hot-patch of failed/alligatored areas and small potholes. Covers up to 150 linear feet of cracks or 40 sq ft of hot-patch — heavier damage is quoted after inspection.',
   'sealcoating',
   '{"flat_cents":25000}'::jsonb,
   true, false, 7, 4, 11);
