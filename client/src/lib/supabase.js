import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {

  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — add them to client/.env.local'
  );
}

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'placeholder-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
