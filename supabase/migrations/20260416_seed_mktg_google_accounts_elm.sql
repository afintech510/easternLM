-- Phase 01: Seed ELM Google Ads account row
INSERT INTO mktg_google_accounts (
  brand_id, google_customer_id, merchant_id, store_code,
  refresh_token_encrypted, publish_mode, monthly_budget_cap_cents,
  conversion_action_purchase, conversion_action_lead
) VALUES (
  'eastern-lm', '5409526270', '5578269156', 'ELM-FROWEIN-01',
  '',
  'suggest', 200000,
  'customers/5409526270/conversionActions/7577588071',
  'customers/5409526270/conversionActions/7577264147'
)
ON CONFLICT (brand_id) DO UPDATE SET
  google_customer_id = EXCLUDED.google_customer_id,
  merchant_id = EXCLUDED.merchant_id,
  store_code = EXCLUDED.store_code,
  conversion_action_purchase = EXCLUDED.conversion_action_purchase,
  conversion_action_lead = EXCLUDED.conversion_action_lead;
