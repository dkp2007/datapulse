do $$
declare
  v_user uuid;
  v_sales uuid;
  v_expenses uuid;
  v_board uuid;
begin
  select id into v_user from auth.users where email = 'demo@datapulse.app';
  if v_user is null then
    raise exception 'Demo user not found';
  end if;

  insert into public.business_profile (
    owner_id, business_name, owner_name, phone, address_line, city, state, pincode,
    gstin, pan, udyam_number, business_type, fiscal_year_start
  ) values (
    v_user, 'Sharma Traders Private Limited', 'Anil Sharma', '9876543210',
    'Shop 12, MG Road', 'Bengaluru', 'Karnataka', '560001',
    '27ABCDE1234F1Z5', 'ABCDE1234F', 'UDYAM-KR-03-0012345', 'Private Limited', 'apr'
  )
  on conflict (owner_id) do nothing;

  if not exists (
    select 1 from public.datasets where owner_id = v_user and name = 'Expenses 2026'
  ) then
    insert into public.datasets (owner_id, name, description, source_type, source_filename, row_count)
    values (v_user, 'Expenses 2026', 'Money going out, month by month', 'csv', 'expenses-2026.csv', 24)
    returning id into v_expenses;

    insert into public.dataset_columns (dataset_id, name, data_type, position) values
      (v_expenses, 'date', 'date', 0),
      (v_expenses, 'category', 'text', 1),
      (v_expenses, 'paid_to', 'text', 2),
      (v_expenses, 'amount', 'number', 3),
      (v_expenses, 'gst_paid', 'number', 4),
      (v_expenses, 'payment_mode', 'text', 5);

    insert into public.dataset_rows (dataset_id, row_index, data) values
      (v_expenses, 0,  '{"date":"2026-01-08","category":"Rent","paid_to":"Skyline Properties","amount":18000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 1,  '{"date":"2026-01-15","category":"Salary","paid_to":"Team payroll","amount":98000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 2,  '{"date":"2026-01-22","category":"Transport","paid_to":"Gati Logistics","amount":12400,"gst_paid":2220,"payment_mode":"UPI"}'),
      (v_expenses, 3,  '{"date":"2026-01-28","category":"Marketing","paid_to":"Google Ads","amount":21500,"gst_paid":3870,"payment_mode":"Card"}'),
      (v_expenses, 4,  '{"date":"2026-02-05","category":"Rent","paid_to":"Skyline Properties","amount":18000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 5,  '{"date":"2026-02-12","category":"Salary","paid_to":"Team payroll","amount":102000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 6,  '{"date":"2026-02-19","category":"Utilities","paid_to":"BESCOM","amount":6850,"gst_paid":0,"payment_mode":"UPI"}'),
      (v_expenses, 7,  '{"date":"2026-02-25","category":"Marketing","paid_to":"Facebook Ads","amount":15750,"gst_paid":2835,"payment_mode":"Card"}'),
      (v_expenses, 8,  '{"date":"2026-03-04","category":"Rent","paid_to":"Skyline Properties","amount":18000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 9,  '{"date":"2026-03-11","category":"Salary","paid_to":"Team payroll","amount":105000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 10, '{"date":"2026-03-18","category":"Transport","paid_to":"Delhivery","amount":18900,"gst_paid":3402,"payment_mode":"UPI"}'),
      (v_expenses, 11, '{"date":"2026-03-26","category":"Software","paid_to":"Zoho Books","amount":8999,"gst_paid":1619,"payment_mode":"Card"}'),
      (v_expenses, 12, '{"date":"2026-04-02","category":"Rent","paid_to":"Skyline Properties","amount":19500,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 13, '{"date":"2026-04-10","category":"Salary","paid_to":"Team payroll","amount":112000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 14, '{"date":"2026-04-17","category":"Marketing","paid_to":"Google Ads","amount":24800,"gst_paid":4464,"payment_mode":"Card"}'),
      (v_expenses, 15, '{"date":"2026-04-24","category":"Transport","paid_to":"Gati Logistics","amount":14600,"gst_paid":2628,"payment_mode":"UPI"}'),
      (v_expenses, 16, '{"date":"2026-05-06","category":"Rent","paid_to":"Skyline Properties","amount":19500,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 17, '{"date":"2026-05-13","category":"Salary","paid_to":"Team payroll","amount":112000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 18, '{"date":"2026-05-21","category":"Utilities","paid_to":"Airtel Broadband","amount":3299,"gst_paid":593,"payment_mode":"UPI"}'),
      (v_expenses, 19, '{"date":"2026-05-28","category":"Software","paid_to":"Notion","amount":6400,"gst_paid":1152,"payment_mode":"Card"}'),
      (v_expenses, 20, '{"date":"2026-06-03","category":"Rent","paid_to":"Skyline Properties","amount":19500,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 21, '{"date":"2026-06-11","category":"Salary","paid_to":"Team payroll","amount":118000,"gst_paid":0,"payment_mode":"Bank transfer"}'),
      (v_expenses, 22, '{"date":"2026-06-18","category":"Transport","paid_to":"Delhivery","amount":21300,"gst_paid":3834,"payment_mode":"UPI"}'),
      (v_expenses, 23, '{"date":"2026-06-25","category":"Marketing","paid_to":"Instagram Ads","amount":19200,"gst_paid":3456,"payment_mode":"Card"}');
  end if;

  if exists (
    select 1 from public.dashboards where owner_id = v_user and name = 'Expenses'
  ) then
    return;
  end if;

  insert into public.dashboards (owner_id, name, description, auto_refresh_seconds)
  values (v_user, 'Expenses', 'Where the money goes: rent, salaries, marketing and the rest.', 0)
  returning id into v_board;

  insert into public.widgets (dashboard_id, widget_type, title, spec, layout, position)
  values
    (
      v_board, 'kpi', 'Total spent (₹)',
      jsonb_build_object(
        'datasetId', v_expenses, 'agg', 'sum', 'field', 'amount',
        'comparePrev', true, 'dateField', 'date',
        'dateFrom', '2026-04-01', 'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":0,"y":0,"w":4,"h":3}'::jsonb, 0
    ),
    (
      v_board, 'kpi', 'GST paid (₹)',
      jsonb_build_object(
        'datasetId', v_expenses, 'agg', 'sum', 'field', 'gst_paid',
        'comparePrev', true, 'dateField', 'date',
        'dateFrom', '2026-04-01', 'dateTo', '2026-06-30',
        'filters', '[]'::jsonb
      ),
      '{"x":4,"y":0,"w":4,"h":3}'::jsonb, 1
    ),
    (
      v_board, 'kpi', 'Biggest expense (₹)',
      jsonb_build_object(
        'datasetId', v_expenses, 'agg', 'max', 'field', 'amount',
        'comparePrev', false, 'dateField', 'date',
        'dateFrom', '', 'dateTo', '',
        'filters', '[]'::jsonb
      ),
      '{"x":8,"y":0,"w":4,"h":3}'::jsonb, 2
    ),
    (
      v_board, 'chart', 'Spending by category (₹)',
      jsonb_build_object(
        'chartType', 'bar-h', 'datasetId', v_expenses,
        'dimension', 'category', 'dimensionType', 'text', 'dateGrain', 'month',
        'measures', jsonb_build_array(jsonb_build_object('agg', 'sum', 'field', 'amount')),
        'filters', '[]'::jsonb, 'limit', 100
      ),
      '{"x":0,"y":3,"w":6,"h":5}'::jsonb, 3
    ),
    (
      v_board, 'chart', 'Month by month (₹)',
      jsonb_build_object(
        'chartType', 'line', 'datasetId', v_expenses,
        'dimension', 'date', 'dimensionType', 'date', 'dateGrain', 'month',
        'measures', jsonb_build_array(jsonb_build_object('agg', 'sum', 'field', 'amount')),
        'filters', '[]'::jsonb, 'limit', 100
      ),
      '{"x":6,"y":3,"w":6,"h":5}'::jsonb, 4
    ),
    (
      v_board, 'table', 'All expenses',
      jsonb_build_object(
        'datasetId', v_expenses,
        'columns', jsonb_build_array('date', 'category', 'paid_to', 'amount', 'gst_paid', 'payment_mode')
      ),
      '{"x":0,"y":8,"w":12,"h":4}'::jsonb, 5
    );
end;
$$;
