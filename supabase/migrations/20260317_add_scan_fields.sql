-- Allow scanned uploads without a supplier assigned
ALTER TABLE supplier_invoices ALTER COLUMN supplier_id DROP NOT NULL;

-- Track document type and who uploaded
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'invoice'
  CHECK (document_type IN ('invoice', 'receipt', 'delivery_ticket', 'other'));
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS uploaded_by text;

-- Add "Base" category
INSERT INTO categories (name, slug, is_active, sort_order)
VALUES ('Base', 'base', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Rename "Bagged & Bucket" → "Bagged Materials"
UPDATE categories SET name = 'Bagged Materials' WHERE slug = 'bagged-material';
