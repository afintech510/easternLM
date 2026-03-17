-- Supplier invoices table
create table if not exists supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  invoice_number text,
  invoice_date date,
  total_amount_cents integer,
  file_urls text[] not null default '{}',
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'processing', 'extracted', 'confirmed', 'failed')),
  extracted_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  line_items jsonb not null default '[]',
  raw_extraction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_supplier_invoices_supplier on supplier_invoices(supplier_id);
create index if not exists idx_supplier_invoices_status on supplier_invoices(ocr_status);
create index if not exists idx_supplier_invoices_created on supplier_invoices(created_at desc);

-- RLS
alter table supplier_invoices enable row level security;
create policy "admin_all" on supplier_invoices for all using (true);
