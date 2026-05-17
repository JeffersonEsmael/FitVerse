// Supabase Configuration — Single source of truth for the Supabase client.
// IMPORTANT: Never create a second supabase client anywhere else in the codebase.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] FATAL: Missing environment variables. Check .env file.');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗ MISSING');
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗ MISSING');
}

// Validate that the anon key looks like a JWT (starts with eyJ)
if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
  console.error(
    '[Supabase] FATAL: VITE_SUPABASE_ANON_KEY does not look like a valid JWT.\n' +
    '  Expected format: eyJhbGci... (JWT)\n' +
    '  Got: ' + supabaseAnonKey.substring(0, 20) + '...\n' +
    '  Fix: Go to Supabase Dashboard → Settings → API → anon public key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Set to false for SPA apps without URL-based auth
    storage: window.localStorage,
  },
});

export default supabase;
