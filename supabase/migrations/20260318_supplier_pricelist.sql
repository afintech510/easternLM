-- Supplier pricelist metadata
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pricelist_effective_date date;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pricelist_documents jsonb DEFAULT '[]'::jsonb;

-- Barcode and SKU for products (scanner support)
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
