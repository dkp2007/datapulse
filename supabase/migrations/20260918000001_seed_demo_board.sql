do $$
declare
  v_user uuid;
  v_dataset uuid;
  v_board uuid;
begin
  select id into v_user from auth.users where email = 'demo@datapulse.app';
  if v_user is null then
    raise exception 'Demo user not found. Run the 20260917000001_seed_demo_user.sql step first (npx supabase db push after signing up the demo account).';
  end if;

  if not exists (
    select 1 from public.datasets where owner_id = v_user and name = 'Sample sales data'
  ) then
    insert into public.datasets (owner_id, name, description, source_type, source_filename, row_count)
    values (v_user, 'Sample sales data', 'A small example file to play with', 'csv', 'sample-data.csv', 20)
    returning id into v_dataset;

    insert into public.dataset_columns (dataset_id, name, data_type, position) values
      (v_dataset, 'date', 'date', 0),
      (v_dataset, 'region', 'text', 1),
      (v_dataset, 'product', 'text', 2),
      (v_dataset, 'units_sold', 'number', 3),
      (v_dataset, 'unit_price', 'number', 4),
      (v_dataset, 'revenue', 'number', 5),
      (v_dataset, 'customer_satisfaction', 'number', 6);

    insert into public.dataset_rows (dataset_id, row_index, data) values
      (v_dataset, 0,  '{"date":"2026-01-05","region":"EMEA","product":"Widget Pro","units_sold":120,"unit_price":29.99,"revenue":3598.80,"customer_satisfaction":4.5}'),
      (v_dataset, 1,  '{"date":"2026-01-12","region":"NA","product":"Widget Lite","units_sold":340,"unit_price":9.99,"revenue":3396.60,"customer_satisfaction":4.1}'),
      (v_dataset, 2,  '{"date":"2026-01-19","region":"APAC","product":"Widget Pro","units_sold":85,"unit_price":29.99,"revenue":2549.15,"customer_satisfaction":4.7}'),
      (v_dataset, 3,  '{"date":"2026-02-02","region":"EMEA","product":"Widget Lite","units_sold":410,"unit_price":9.99,"revenue":4095.90,"customer_satisfaction":4.2}'),
      (v_dataset, 4,  '{"date":"2026-02-09","region":"NA","product":"Widget Max","units_sold":60,"unit_price":59.99,"revenue":3599.40,"customer_satisfaction":4.8}'),
      (v_dataset, 5,  '{"date":"2026-02-16","region":"APAC","product":"Widget Lite","units_sold":295,"unit_price":9.99,"revenue":2947.05,"customer_satisfaction":4.0}'),
      (v_dataset, 6,  '{"date":"2026-03-01","region":"EMEA","product":"Widget Max","units_sold":45,"unit_price":59.99,"revenue":2699.55,"customer_satisfaction":4.6}'),
      (v_dataset, 7,  '{"date":"2026-03-08","region":"NA","product":"Widget Pro","units_sold":180,"unit_price":29.99,"revenue":5398.20,"customer_satisfaction":4.4}'),
      (v_dataset, 8,  '{"date":"2026-03-15","region":"APAC","product":"Widget Max","units_sold":70,"unit_price":59.99,"revenue":4199.30,"customer_satisfaction":4.9}'),
      (v_dataset, 9,  '{"date":"2026-03-22","region":"EMEA","product":"Widget Lite","units_sold":380,"unit_price":9.99,"revenue":3796.20,"customer_satisfaction":4.3}'),
      (v_dataset, 10, '{"date":"2026-04-05","region":"NA","product":"Widget Lite","units_sold":520,"unit_price":9.99,"revenue":5194.80,"customer_satisfaction":4.2}'),
      (v_dataset, 11, '{"date":"2026-04-12","region":"APAC","product":"Widget Pro","units_sold":140,"unit_price":29.99,"revenue":4198.60,"customer_satisfaction":4.6}'),
      (v_dataset, 12, '{"date":"2026-04-19","region":"EMEA","product":"Widget Max","units_sold":55,"unit_price":59.99,"revenue":3299.45,"customer_satisfaction":4.7}'),
      (v_dataset, 13, '{"date":"2026-05-03","region":"NA","product":"Widget Pro","units_sold":210,"unit_price":29.99,"revenue":6297.90,"customer_satisfaction":4.5}'),
      (v_dataset, 14, '{"date":"2026-05-10","region":"APAC","product":"Widget Lite","units_sold":330,"unit_price":9.99,"revenue":3296.70,"customer_satisfaction":4.1}'),
      (v_dataset, 15, '{"date":"2026-05-17","region":"EMEA","product":"Widget Pro","units_sold":165,"unit_price":29.99,"revenue":4948.35,"customer_satisfaction":4.4}'),
      (v_dataset, 16, '{"date":"2026-06-01","region":"NA","product":"Widget Max","units_sold":90,"unit_price":59.99,"revenue":5399.10,"customer_satisfaction":4.8}'),
      (v_dataset, 17, '{"date":"2026-06-08","region":"APAC","product":"Widget Pro","units_sold":125,"unit_price":29.99,"revenue":3748.75,"customer_satisfaction":4.5}'),
      (v_dataset, 18, '{"date":"2026-06-15","region":"EMEA","product":"Widget Lite","units_sold":455,"unit_price":9.99,"revenue":4545.45,"customer_satisfaction":4.2}'),
      (v_dataset, 19, '{"date":"2026-06-22","region":"NA","product":"Widget Lite","units_sold":610,"unit_price":9.99,"revenue":6093.90,"customer_satisfaction":4.3}');
  else
    select id into v_dataset from public.datasets where owner_id = v_user and name = 'Sample sales data' limit 1;
  end if;

  if exists (
    select 1 from public.dashboards where owner_id = v_user and name = 'Sales Overview'
  ) then
    return;
  end if;

  insert into public.dashboards (owner_id, name, description, auto_refresh_seconds)
  values (v_user, 'Sales Overview', 'Your sales story: money in, units out, and how each region and product is doing.', 300)
  returning id into v_board;

  insert into public.widgets (dashboard_id, widget_type, title, spec, layout, position)
  values
    (
      v_board, 'kpi', 'Money made (₹)',
      jsonb_build_object(
        'datasetId', v_dataset,
        'agg', 'sum',
        'field', 'revenue',
        'comparePrev', true,
        'dateField', 'date',
        'dateFrom', '2026-04-01',
        'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":0,"y":0,"w":3,"h":3}'::jsonb, 0
    ),
    (
      v_board, 'kpi', 'Items sold',
      jsonb_build_object(
        'datasetId', v_dataset,
        'agg', 'sum',
        'field', 'units_sold',
        'comparePrev', true,
        'dateField', 'date',
        'dateFrom', '2026-04-01',
        'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":3,"y":0,"w":3,"h":3}'::jsonb, 1
    ),
    (
      v_board, 'kpi', 'Happy customers',
      jsonb_build_object(
        'datasetId', v_dataset,
        'agg', 'avg',
        'field', 'customer_satisfaction',
        'comparePrev', true,
        'dateField', 'date',
        'dateFrom', '2026-04-01',
        'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":6,"y":0,"w":3,"h":3}'::jsonb, 2
    ),
    (
      v_board, 'kpi', 'Sales records',
      jsonb_build_object(
        'datasetId', v_dataset,
        'agg', 'count',
        'field', null,
        'comparePrev', true,
        'dateField', 'date',
        'dateFrom', '2026-04-01',
        'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":9,"y":0,"w":3,"h":3}'::jsonb, 3
    ),
    (
      v_board, 'chart', 'Money made each month (₹)',
      jsonb_build_object(
        'chartType', 'bar',
        'datasetId', v_dataset,
        'dimension', 'date',
        'dimensionType', 'date',
        'dateGrain', 'month',
        'measures', jsonb_build_array(jsonb_build_object('agg', 'sum', 'field', 'revenue')),
        'filters', '[]'::jsonb,
        'limit', 100
      ),
      '{"x":0,"y":3,"w":8,"h":5}'::jsonb, 4
    ),
    (
      v_board, 'chart', 'Where the money comes from (₹)',
      jsonb_build_object(
        'chartType', 'doughnut',
        'datasetId', v_dataset,
        'dimension', 'region',
        'dimensionType', 'text',
        'dateGrain', 'month',
        'measures', jsonb_build_array(jsonb_build_object('agg', 'sum', 'field', 'revenue')),
        'filters', '[]'::jsonb,
        'limit', 100
      ),
      '{"x":8,"y":3,"w":4,"h":5}'::jsonb, 5
    ),
    (
      v_board, 'chart', 'Products ranked',
      jsonb_build_object(
        'chartType', 'bar-h',
        'datasetId', v_dataset,
        'dimension', 'product',
        'dimensionType', 'text',
        'dateGrain', 'month',
        'measures', jsonb_build_array(jsonb_build_object('agg', 'sum', 'field', 'units_sold')),
        'filters', '[]'::jsonb,
        'limit', 100
      ),
      '{"x":0,"y":8,"w":8,"h":4}'::jsonb, 6
    ),
    (
      v_board, 'table', 'All the sales records',
      jsonb_build_object(
        'datasetId', v_dataset,
        'columns', jsonb_build_array('date', 'region', 'product', 'units_sold', 'unit_price', 'revenue', 'customer_satisfaction')
      ),
      '{"x":8,"y":8,"w":4,"h":4}'::jsonb, 7
    ),
    (
      v_board, 'kpi', 'Biggest single sale (₹)',
      jsonb_build_object(
        'datasetId', v_dataset,
        'agg', 'max',
        'field', 'revenue',
        'comparePrev', false,
        'dateField', 'date',
        'dateFrom', '',
        'dateTo', '',
        'filters', '[]'::jsonb
      ),
      '{"x":8,"y":12,"w":4,"h":3}'::jsonb, 8
    );
end;
$$;
