create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text not null,
  invoice_date date not null default current_date,
  due_date date,
  client_name text not null,
  client_gstin text,
  client_address text,
  place_of_supply text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, invoice_number)
);
create index invoices_owner_idx on public.invoices (owner_id, invoice_date desc);

alter table public.invoices enable row level security;

create policy invoices_owner
  on public.invoices
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
