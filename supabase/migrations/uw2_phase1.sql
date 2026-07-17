-- ============================================================
-- Rasoi Capital · Underwriting Engine v2 · Phase 1 migration
-- Run in Supabase SQL Editor. Additive only — no existing
-- tables are modified except score_runs (2 new columns).
-- ============================================================

create table if not exists uw_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id),
  outlet_name text not null,
  doc_type text not null check (doc_type in ('bank_statement','zomato_payout','swiggy_payout')),
  storage_path text not null,
  parse_status text not null default 'pending'
    check (parse_status in ('pending','parsing','parsed','failed','manual')),
  parse_confidence numeric,
  parsed_json jsonb,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists uw_bank_txns (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references uw_documents(id) on delete cascade,
  txn_date date not null,
  description text,
  amount numeric not null,
  direction text not null check (direction in ('credit','debit')),
  category text default 'OTHER',
  confidence numeric
);
create index if not exists idx_uw_bank_txns_doc on uw_bank_txns(document_id);
create index if not exists idx_uw_bank_txns_date on uw_bank_txns(txn_date);

create table if not exists uw_payouts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references uw_documents(id) on delete cascade,
  platform text not null check (platform in ('zomato','swiggy')),
  period_start date,
  period_end date,
  gross_sales numeric,
  commission numeric,
  ads numeric,
  promos numeric,
  taxes numeric,
  net_payout numeric not null,
  matched_txn_id uuid references uw_bank_txns(id),
  confidence numeric
);
create index if not exists idx_uw_payouts_doc on uw_payouts(document_id);

create table if not exists uw_reconciliations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id),
  outlet_name text not null,
  match_rate numeric,
  variance_score numeric,
  anomaly_score numeric,
  dis numeric,
  dis_band text check (dis_band in ('TRUSTED','REVIEW','FLAGGED')),
  anomalies jsonb default '[]',
  monthly_series jsonb,
  derived_avg_monthly_sales numeric,
  derived_qq_growth numeric,
  created_at timestamptz default now()
);

create table if not exists uw_exhaust_snapshots (
  id uuid primary key default gen_random_uuid(),
  outlet_name text not null,
  zomato_url text,
  gmaps_url text,
  rating numeric,
  rating_count int,
  price_for_two numeric,
  cuisines text[],
  is_open boolean,
  review_velocity numeric,
  prescore numeric,
  raw jsonb,
  captured_at timestamptz default now()
);

alter table score_runs add column if not exists input_provenance jsonb default '{}';
alter table score_runs add column if not exists reconciliation_id uuid references uw_reconciliations(id);

-- RLS: enable and lock down; all writes go through service-role (server).
alter table uw_documents enable row level security;
alter table uw_bank_txns enable row level security;
alter table uw_payouts enable row level security;
alter table uw_reconciliations enable row level security;
alter table uw_exhaust_snapshots enable row level security;

-- Authenticated users can read (mirror/adjust to your existing policy pattern before running)
create policy "auth read uw_documents" on uw_documents for select to authenticated using (true);
create policy "auth read uw_bank_txns" on uw_bank_txns for select to authenticated using (true);
create policy "auth read uw_payouts" on uw_payouts for select to authenticated using (true);
create policy "auth read uw_reconciliations" on uw_reconciliations for select to authenticated using (true);
create policy "auth read uw_exhaust" on uw_exhaust_snapshots for select to authenticated using (true);

-- Storage bucket (private). If it already exists this errors harmlessly — ignore.
insert into storage.buckets (id, name, public) values ('uw-docs','uw-docs', false)
on conflict (id) do nothing;
