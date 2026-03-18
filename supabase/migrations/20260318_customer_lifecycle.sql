-- Customer type for behavior-driven UI and follow-up sequences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'homeowner'
  CHECK (customer_type IN ('homeowner', 'contractor', 'business', 'service_lead'));

-- Auto-assign existing contractor-tagged customers
UPDATE customers SET customer_type = 'contractor' WHERE 'contractor' = ANY(tags) AND customer_type = 'homeowner';
UPDATE customers SET customer_type = 'business' WHERE is_charge_account = true AND company_name IS NOT NULL AND customer_type = 'homeowner';
UPDATE customers SET customer_type = 'service_lead' WHERE source = 'service_lead' AND total_orders = 0 AND customer_type = 'homeowner';
