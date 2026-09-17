

alter table public.profiles        enable row level security;
alter table public.datasets        enable row level security;
alter table public.dataset_columns enable row level security;
alter table public.dataset_rows    enable row level security;
alter table public.dashboards      enable row level security;
alter table public.widgets         enable row level security;
alter table public.reports         enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "datasets_select_own" on public.datasets
  for select using (owner_id = auth.uid());
create policy "datasets_insert_own" on public.datasets
  for insert with check (owner_id = auth.uid());
create policy "datasets_update_own" on public.datasets
  for update using (owner_id = auth.uid());
create policy "datasets_delete_own" on public.datasets
  for delete using (owner_id = auth.uid());

create policy "columns_select_own" on public.dataset_columns
  for select using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "columns_insert_own" on public.dataset_columns
  for insert with check (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "columns_update_own" on public.dataset_columns
  for update using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "columns_delete_own" on public.dataset_columns
  for delete using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );

create policy "rows_select_own" on public.dataset_rows
  for select using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "rows_insert_own" on public.dataset_rows
  for insert with check (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "rows_update_own" on public.dataset_rows
  for update using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );
create policy "rows_delete_own" on public.dataset_rows
  for delete using (
    exists (select 1 from public.datasets d
            where d.id = dataset_id and d.owner_id = auth.uid())
  );

create policy "dashboards_select_own" on public.dashboards
  for select using (owner_id = auth.uid());
create policy "dashboards_insert_own" on public.dashboards
  for insert with check (owner_id = auth.uid());
create policy "dashboards_update_own" on public.dashboards
  for update using (owner_id = auth.uid());
create policy "dashboards_delete_own" on public.dashboards
  for delete using (owner_id = auth.uid());

create policy "widgets_select_own" on public.widgets
  for select using (
    exists (select 1 from public.dashboards d
            where d.id = dashboard_id and d.owner_id = auth.uid())
  );
create policy "widgets_insert_own" on public.widgets
  for insert with check (
    exists (select 1 from public.dashboards d
            where d.id = dashboard_id and d.owner_id = auth.uid())
  );
create policy "widgets_update_own" on public.widgets
  for update using (
    exists (select 1 from public.dashboards d
            where d.id = dashboard_id and d.owner_id = auth.uid())
  );
create policy "widgets_delete_own" on public.widgets
  for delete using (
    exists (select 1 from public.dashboards d
            where d.id = dashboard_id and d.owner_id = auth.uid())
  );

create policy "reports_select_own" on public.reports
  for select using (owner_id = auth.uid());
create policy "reports_insert_own" on public.reports
  for insert with check (owner_id = auth.uid());
create policy "reports_update_own" on public.reports
  for update using (owner_id = auth.uid());
create policy "reports_delete_own" on public.reports
  for delete using (owner_id = auth.uid());
