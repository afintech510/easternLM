-- Google Reviews cache (refreshed daily via cron)
CREATE TABLE IF NOT EXISTS public.google_reviews_cache (
  id integer PRIMARY KEY DEFAULT 1,
  place_id text NOT NULL,
  overall_rating numeric(2,1),
  total_reviews integer,
  reviews jsonb NOT NULL DEFAULT '[]',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with the Place ID
INSERT INTO google_reviews_cache (id, place_id, overall_rating, total_reviews, reviews)
VALUES (1, 'ChIJN0YgVW5Z6IkRh5ZqxoDCTNU', 5.0, 17, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
