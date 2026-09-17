do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = 'demo@datapulse.app';
  if v_user is null then
    raise notice 'Demo user not found, skipping invoice seed.';
    return;
  end if;

  if exists (select 1 from public.invoices where owner_id = v_user) then
    raise notice 'Demo invoices already present, skipping.';
    return;
  end if;

  insert into public.invoices (owner_id, invoice_number, invoice_date, due_date, client_name, client_gstin, client_address, place_of_supply, items, notes)
  values
    (v_user, '26-27-001', '2026-07-12', '2026-07-27', 'Gupta Electronics', '29AABCU9603R1ZM', '14, SP Road, Bengaluru, Karnataka 560002', 'Karnataka',
     '[{"description":"LED panel lights (box of 20)","hsn":"9405","qty":6,"rate":4200,"gstRate":18},{"description":"Installation service","hsn":"998739","qty":1,"rate":3500,"gstRate":18}]'::jsonb,
     'Thank you for your business.'),
    (v_user, '26-27-002', '2026-07-28', '2026-08-12', 'Mehta Traders', '27AAECM1234A1Z5', '22, Lamington Road, Mumbai, Maharashtra 400007', 'Maharashtra',
     '[{"description":"Copper wiring (100m roll)","hsn":"8544","qty":12,"rate":2850,"gstRate":18}]'::jsonb,
     null),
    (v_user, '26-27-003', '2026-08-09', '2026-08-24', 'Nair Home Interiors', null, '8, Anna Nagar, Chennai, Tamil Nadu 600040', 'Tamil Nadu',
     '[{"description":"Ceiling fans (sweep 1200mm)","hsn":"8414","qty":10,"rate":2400,"gstRate":18},{"description":"Delivery and fitting","hsn":"998540","qty":1,"rate":1800,"gstRate":18}]'::jsonb,
     'Delivery included within city limits.'),
    (v_user, '26-27-004', '2026-08-21', '2026-09-05', 'Gupta Electronics', '29AABCU9603R1ZM', '14, SP Road, Bengaluru, Karnataka 560002', 'Karnataka',
     '[{"description":"Solar inverter 5kVA","hsn":"8504","qty":2,"rate":48500,"gstRate":12}]'::jsonb,
     null),
    (v_user, '26-27-005', '2026-09-04', '2026-09-19', 'Kaur Event Decor', null, '45, Sector 17, Chandigarh 160017', 'Chandigarh',
     '[{"description":"Decorative lighting package","hsn":"9405","qty":1,"rate":32000,"gstRate":18},{"description":"Technician on-site (2 days)","hsn":"998739","qty":2,"rate":2500,"gstRate":18}]'::jsonb,
     'Advance of 50% received via UPI.');

  raise notice 'Seeded 5 demo invoices for the demo user.';
end $$;
