create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.dashboards (id) on delete cascade,
  member_email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  unique (board_id, member_email)
);
create index board_members_board_idx on public.board_members (board_id);
create index board_members_email_idx on public.board_members (member_email);

create table public.board_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.dashboards (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  revoked boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index board_shares_board_idx on public.board_shares (board_id);

alter table public.board_members enable row level security;
alter table public.board_shares enable row level security;

create or replace function public.can_read_board(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dashboards d
    where d.id = p_board
      and (d.owner_id = auth.uid()
        or exists (
          select 1 from public.board_members m
          where m.board_id = p_board
            and m.member_email = (select email from auth.users where id = auth.uid())
        ))
  );
$$;

create policy members_read on public.board_members
  for select using (
    invited_by = auth.uid()
    or member_email = (select email from auth.users where id = auth.uid())
  );
create policy members_manage on public.board_members
  for all using (
    exists (select 1 from public.dashboards d where d.id = board_id and d.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.dashboards d where d.id = board_id and d.owner_id = auth.uid())
  );

create policy shares_manage on public.board_shares
  for all using (
    exists (select 1 from public.dashboards d where d.id = board_id and d.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.dashboards d where d.id = board_id and d.owner_id = auth.uid())
  );

create policy dashboards_member_read on public.dashboards
  for select using (public.can_read_board(id));

create policy widgets_member_read on public.widgets
  for select using (public.can_read_board(dashboard_id));

drop policy scheduled_reports_service_all on storage.objects;
create policy scheduled_reports_service_rw
  on storage.objects
  for all
  using (
    bucket_id = 'scheduled-reports'
    and (auth.uid()::text = (storage.foldername(name))[1] or auth.role() = 'service_role')
  )
  with check (
    bucket_id = 'scheduled-reports'
    and (auth.uid()::text = (storage.foldername(name))[1] or auth.role() = 'service_role')
  );

create or replace function public.run_widget_query(p_dataset_id uuid, p_spec jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_owner uuid;
  v_board uuid;
  v_kind text;
  v_where text := 'where dataset_id = $1';
  v_dim text;
  v_dim_type text;
  v_grain text;
  v_dim_expr text;
  v_measure jsonb;
  v_agg text;
  v_field text;
  v_expr text;
  v_select_items text := '';
  v_limit int;
  v_filters jsonb;
  v_f jsonb;
  v_op text;
  v_ftype text;
  v_val text;
  v_from text;
  v_to text;
  v_span interval;
  v_prev_where text := '';
  v_sql text;
  v_value numeric;
  v_prev numeric;
  v_rec record;
  v_values jsonb;
  v_rows jsonb;
  v_num_meas int;
  j int;
begin
  select owner_id into v_owner from public.datasets where id = p_dataset_id;
  if v_owner is null
     or (v_owner <> auth.uid()
         and not exists (
           select 1 from public.board_members m
           join public.widgets w on w.dashboard_id = m.board_id
           where w.spec ->> 'datasetId' = p_dataset_id::text
             and m.member_email = (select email from auth.users where id = auth.uid())
         )) then
    raise exception 'Dataset not found or not shared with you';
  end if;

  v_kind := coalesce(p_spec ->> 'kind', 'series');
  v_filters := coalesce(p_spec -> 'filters', '[]'::jsonb);

  if p_spec ? 'fromDate' and p_spec ? 'toDate' then
    v_from := p_spec ->> 'fromDate';
    v_to := p_spec ->> 'toDate';
    if v_from is not null and v_to is not null then
      v_where := v_where || format(
        ' and (data ->> %L)::timestamptz >= %L and (data ->> %L)::timestamptz <= %L',
        coalesce(p_spec ->> 'dateField', 'date'),
        v_from::timestamptz,
        coalesce(p_spec ->> 'dateField', 'date'),
        (v_to::date + 1)::timestamptz
      );
    end if;
  end if;

  if jsonb_typeof(v_filters) = 'array' then
    for i in 0 .. jsonb_array_length(v_filters) - 1 loop
      v_f := v_filters -> i;
      v_op := v_f ->> 'op';
      v_val := v_f ->> 'value';
      if v_op not in ('=', '!=', '>', '>=', '<', '<=', 'contains') then
        raise exception 'Unsupported filter op: %', v_op;
      end if;
      if v_op = 'contains' then
        v_where := v_where || format(' and (data ->> %L) ilike %L',
          v_f ->> 'field', '%' || v_val || '%');
      else
        v_ftype := coalesce(v_f ->> 'type', 'text');
        if v_ftype = 'number' then
          v_where := v_where || format(' and (data ->> %L)::numeric %s %L',
            v_f ->> 'field', v_op, v_val::numeric);
        elsif v_ftype = 'date' then
          v_where := v_where || format(' and (data ->> %L)::timestamptz %s %L',
            v_f ->> 'field', v_op, v_val::timestamptz);
        else
          v_where := v_where || format(' and (data ->> %L) %s %L',
            v_f ->> 'field', v_op, v_val);
        end if;
      end if;
    end loop;
  end if;

  if v_kind = 'scalar' then
    v_measure := p_spec -> 'measure';
    v_agg := v_measure ->> 'agg';
    v_field := v_measure ->> 'field';
    if v_agg not in ('sum', 'avg', 'count', 'count_distinct', 'min', 'max') then
      raise exception 'Unsupported aggregate: %', v_agg;
    end if;
    if v_agg = 'count' then
      v_expr := 'count(*)::numeric';
    elsif v_agg = 'count_distinct' then
      v_expr := format('count(distinct data ->> %L)::numeric', v_field);
    else
      v_expr := format('%s((data ->> %L)::numeric)', upper(v_agg), v_field);
    end if;

    v_sql := format('select coalesce(%s, 0) from public.dataset_rows %s', v_expr, v_where);
    execute v_sql into v_value using p_dataset_id;

    v_from := p_spec ->> 'dateFrom';
    v_to := p_spec ->> 'dateTo';
    if coalesce((p_spec ->> 'comparePrev')::boolean, false)
       and v_from is not null and v_to is not null and (p_spec ->> 'dateField') is not null then
      v_span := v_to::timestamptz - v_from::timestamptz;
      v_prev_where := format(
        ' and (data ->> %L)::timestamptz >= %L and (data ->> %L)::timestamptz < %L',
        p_spec ->> 'dateField', v_from::timestamptz - v_span, p_spec ->> 'dateField', v_from::timestamptz);
      execute format('select coalesce(%s, 0) from public.dataset_rows %s%s',
        v_expr, v_where, v_prev_where) into v_prev using p_dataset_id;
    end if;

    return jsonb_build_object(
      'kind', 'scalar',
      'value', v_value,
      'prev', v_prev,
      'deltaPct', case
        when v_prev is null or v_prev = 0 then null
        else round((v_value - v_prev) / abs(v_prev) * 100, 1)
      end,
      'ranAt', now()
    );
  end if;

  v_dim := p_spec ->> 'dimension';
  v_dim_type := coalesce(p_spec ->> 'dimensionType', 'text');
  v_grain := coalesce(p_spec ->> 'dateGrain', 'month');
  v_limit := least(coalesce((p_spec ->> 'limit')::int, 100), 500);

  if v_dim is null then
    raise exception 'Series query requires a dimension';
  end if;

  if v_dim_type = 'date' then
    if v_grain = 'day' then
      v_dim_expr := format('to_char((data ->> %L)::timestamptz, ''YYYY-MM-DD'')', v_dim);
    elsif v_grain = 'week' then
      v_dim_expr := format('to_char(date_trunc(''week'', (data ->> %L)::timestamptz), ''IYYY\"-W\"IW'')', v_dim);
    elsif v_grain = 'quarter' then
      v_dim_expr := format('to_char(date_trunc(''quarter'', (data ->> %L)::timestamptz), ''YYYY\"-Q\"Q'')', v_dim);
    elsif v_grain = 'year' then
      v_dim_expr := format('to_char(date_trunc(''year'', (data ->> %L)::timestamptz), ''YYYY'')', v_dim);
    else
      v_dim_expr := format('to_char(date_trunc(''month'', (data ->> %L)::timestamptz), ''YYYY-MM'')', v_dim);
    end if;
  elsif v_dim_type = 'number' then
    v_dim_expr := format('(data ->> %L)::numeric::text', v_dim);
  else
    v_dim_expr := format('coalesce(nullif(data ->> %L, ''''), ''(blank)'')', v_dim);
  end if;

  if p_spec -> 'measures' is null or jsonb_typeof(p_spec -> 'measures') <> 'array'
     or jsonb_array_length(p_spec -> 'measures') > 3
     or jsonb_array_length(p_spec -> 'measures') = 0 then
    raise exception 'Series query requires one to three measures';
  end if;

  for i in 0 .. jsonb_array_length(p_spec -> 'measures') - 1 loop
    v_measure := p_spec -> 'measures' -> i;
    v_agg := v_measure ->> 'agg';
    v_field := v_measure ->> 'field';
    if v_agg not in ('sum', 'avg', 'count', 'count_distinct', 'min', 'max') then
      raise exception 'Unsupported aggregate: %', v_agg;
    end if;
    if v_agg = 'count' then
      v_expr := 'count(*)::numeric';
    elsif v_agg = 'count_distinct' then
      v_expr := format('count(distinct data ->> %L)::numeric', v_field);
    else
      v_expr := format('%s((data ->> %L)::numeric)', upper(v_agg), v_field);
    end if;
    v_select_items := v_select_items ||
      case when v_select_items = '' then '' else ', ' end ||
      format('%s as m%s', v_expr, i);
  end loop;

  v_sql := format(
    'select %s as dimension, %s
       from public.dataset_rows %s
       group by 1
       order by 1 asc
       limit %s',
    v_dim_expr, v_select_items, v_where, v_limit
  );

  v_num_meas := jsonb_array_length(p_spec -> 'measures');
  v_rows := '[]'::jsonb;
  for v_rec in execute v_sql using p_dataset_id loop
    v_values := '[]'::jsonb;
    for j in 0 .. v_num_meas - 1 loop
      v_values := v_values || to_jsonb((to_jsonb(v_rec) ->> ('m' || j::text))::numeric);
    end loop;
    v_rows := v_rows || jsonb_build_object('dimension', v_rec.dimension, 'values', v_values);
  end loop;

  return jsonb_build_object(
    'kind', 'series',
    'dimension', v_dim,
    'rows', v_rows,
    'ranAt', now()
  );
end;
$$;

alter table public.widgets drop constraint widgets_widget_type_check;
alter table public.widgets add constraint widgets_widget_type_check
  check (widget_type in ('chart', 'kpi', 'table', 'pivot'));
