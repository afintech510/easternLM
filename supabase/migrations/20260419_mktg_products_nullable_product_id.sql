-- Allow product_id to be NULL for GMC-sourced product status sync
ALTER TABLE mktg_google_products ALTER COLUMN product_id DROP NOT NULL;
