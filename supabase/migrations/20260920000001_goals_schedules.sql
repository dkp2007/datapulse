create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  metric text not null default 'sum',
  field text,
  target numeric not null,
  period text not null default 'month'
    check (period in ('month', 'week', 'quarter', 'year')),
  dataset_id uuid references public.datasets (id) on delete cascade,
  date_field text,
  created_at timestamptz not null default now()
);
create index goals_owner_idx on public.goals (owner_id, created_at desc);

create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  email text not null,
  frequency text not null default 'weekly'
    check (frequency in ('daily', 'weekly', 'monthly')),
  day_of_week integer not null default 1
    check (day_of_week between 0 and 6),
  day_of_month integer not null default 1
    check (day_of_month between 1 and 28),
  hour_utc integer not null default 2
    check (hour_utc between 0 and 23),
  format text not null default 'pdf'
    check (format in ('pdf', 'csv', 'xlsx')),
  last_sent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index schedules_owner_idx on public.report_schedules (owner_id, dashboard_id);

alter table public.goals enable row level security;
alter table public.report_schedules enable row level security;

create policy goals_owner on public.goals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy schedules_owner on public.report_schedules
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('scheduled-reports', 'scheduled-reports', false)
on conflict (id) do nothing;

create policy scheduled_reports_service_all
  on storage.objects
  for all
  using (bucket_id = 'scheduled-reports')
  with check (bucket_id = 'scheduled-reports');

create or replace function public.current_period_value(p_goal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_goal record;
  v_where text;
  v_expr text;
  v_value numeric := 0;
  v_start date;
  v_end date;
begin
  select * into v_goal from public.goals where id = p_goal_id;
  if not found then
    raise exception 'Goal not found';
  end if;
  if v_goal.owner_id <> auth.uid() then
    raise exception 'Goal not found';
  end if;

  case v_goal.period
    when 'week' then
      v_start := date_trunc('week', now())::date;
      v_end := (date_trunc('week', now()) + interval '1 week')::date;
    when 'quarter' then
      v_start := date_trunc('quarter', now())::date;
      v_end := (date_trunc('quarter', now()) + interval '1 quarter')::date;
    when 'year' then
      v_start := date_trunc('year', now())::date;
      v_end := (date_trunc('year', now()) + interval '1 year')::date;
    else
      v_start := date_trunc('month', now())::date;
      v_end := (date_trunc('month', now()) + interval '1 month')::date;
  end case;

  if v_goal.dataset_id is null then
    return jsonb_build_object('value', 0, 'target', v_goal.target, 'periodStart', v_start, 'periodEnd', v_end);
  end if;

  if v_goal.metric = 'count' then
    v_expr := 'count(*)::numeric';
  else
    v_expr := format('%s((data ->> %L)::numeric)', upper(coalesce(v_goal.metric, 'sum')), v_goal.field);
  end if;

  v_where := format(
    'where dataset_id = $1 and (data ->> %L)::timestamptz >= %L and (data ->> %L)::timestamptz < %L',
    v_goal.date_field, v_start::timestamptz, v_goal.date_field, v_end::timestamptz
  );

  execute format('select coalesce(%s, 0) from public.dataset_rows %s', v_expr, v_where)
    into v_value
    using v_goal.dataset_id;

  return jsonb_build_object('value', v_value, 'target', v_goal.target, 'periodStart', v_start, 'periodEnd', v_end);
end;
$$;

revoke execute on function public.current_period_value(uuid) from anon, public;
grant execute on function public.current_period_value(uuid) to authenticated;
