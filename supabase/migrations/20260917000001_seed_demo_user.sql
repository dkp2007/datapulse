UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'demo@datapulse.app';

INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(NULLIF(raw_user_meta_data ->> 'full_name', ''), 'Demo User')
FROM auth.users
WHERE email = 'demo@datapulse.app'
ON CONFLICT (id) DO NOTHING;
