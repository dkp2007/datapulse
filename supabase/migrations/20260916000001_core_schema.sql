

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth.users id, auto-created by trigger (see 003).';

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  source_type text not null default 'csv'
    check (source_type in ('csv', 'xlsx')),
  source_filename text,
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index datasets_owner_idx on public.datasets (owner_id, created_at desc);

create table public.dataset_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null,
  data_type text not null
    check (data_type in ('number', 'date', 'text', 'boolean')),
  position integer not null,
  unique (dataset_id, name)
);
create index dataset_columns_dataset_idx on public.dataset_columns (dataset_id, position);

create table public.dataset_rows (
  id bigint generated always as identity primary key,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  row_index integer not null,
  data jsonb not null,
  unique (dataset_id, row_index)
);
create index dataset_rows_dataset_idx on public.dataset_rows (dataset_id, row_index);

create index dataset_rows_data_gin_idx on public.dataset_rows using gin (data jsonb_path_ops);

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  auto_refresh_seconds integer not null default 0
    check (auto_refresh_seconds between 0 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboards_owner_idx on public.dashboards (owner_id, created_at desc);

create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  widget_type text not null
    check (widget_type in ('chart', 'kpi', 'table')),
  title text not null default 'Untitled widget',

  spec jsonb not null default '{}'::jsonb,

  layout jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index widgets_dashboard_idx on public.widgets (dashboard_id, position);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  name text not null,

  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index reports_owner_idx on public.reports (owner_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger datasets_set_updated_at
  before update on public.datasets
  for each row execute function public.set_updated_at();

create trigger dashboards_set_updated_at
  before update on public.dashboards
  for each row execute function public.set_updated_at();
