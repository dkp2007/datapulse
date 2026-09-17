create table public.business_profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text,
  owner_name text,
  phone text,
  address_line text,
  city text,
  state text,
  pincode text,
  gstin text,
  pan text,
  cin text,
  udyam_number text,
  business_type text,
  fiscal_year_start text default 'apr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  doc_type text not null default 'other',
  file_path text not null,
  file_size bigint not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);
create index documents_owner_idx on public.documents (owner_id, created_at desc);

alter table public.business_profile enable row level security;
alter table public.documents enable row level security;

create policy business_profile_owner
  on public.business_profile
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy documents_owner
  on public.documents
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_read_own
  on storage.objects
  for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy documents_insert_own
  on storage.objects
  for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy documents_delete_own
  on storage.objects
  for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy documents_update_own
  on storage.objects
  for update
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create trigger business_profile_set_updated_at
  before update on public.business_profile
  for each row execute function public.set_updated_at();

create or replace function public.upsert_business_profile(p_patch jsonb)
returns public.business_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  insert into public.business_profile (owner_id)
  values (v_user)
  on conflict (owner_id) do nothing;

  update public.business_profile
  set
    business_name = coalesce(nullif(p_patch ->> 'business_name', ''), business_name),
    owner_name = coalesce(nullif(p_patch ->> 'owner_name', ''), owner_name),
    phone = coalesce(nullif(p_patch ->> 'phone', ''), phone),
    address_line = coalesce(nullif(p_patch ->> 'address_line', ''), address_line),
    city = coalesce(nullif(p_patch ->> 'city', ''), city),
    state = coalesce(nullif(p_patch ->> 'state', ''), state),
    pincode = coalesce(nullif(p_patch ->> 'pincode', ''), pincode),
    gstin = coalesce(nullif(p_patch ->> 'gstin', ''), gstin),
    pan = coalesce(nullif(p_patch ->> 'pan', ''), pan),
    cin = coalesce(nullif(p_patch ->> 'cin', ''), cin),
    udyam_number = coalesce(nullif(p_patch ->> 'udyam_number', ''), udyam_number),
    business_type = coalesce(nullif(p_patch ->> 'business_type', ''), business_type),
    fiscal_year_start = coalesce(nullif(p_patch ->> 'fiscal_year_start', ''), fiscal_year_start)
  where owner_id = v_user;

  return (
    select * from public.business_profile where owner_id = v_user
  );
end;
$$;

revoke execute on function public.upsert_business_profile(jsonb) from anon, public;
grant execute on function public.upsert_business_profile(jsonb) to authenticated;
