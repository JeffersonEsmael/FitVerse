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
    detectSessionInUrl: false,
    storage: window.localStorage,
  },
});

// ── Startup diagnostic ────────────────────────────────────────────────────────
// Runs once on app start to detect common misconfigurations.
// Results appear in the browser DevTools console.
(async () => {
  try {
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de diagnóstico')), ms))
    ]);

    // Test 1: Can we reach the profiles table at all?
    const { error: selectError } = await withTimeout(
      supabase.from('profiles').select('id').limit(1),
      5000
    );

    if (selectError) {
      if (selectError.code === '42P01') {
        console.error(
          '[Supabase Diagnostic] ❌ Table "profiles" does not exist!\n' +
          '  → Execute o arquivo fitverse_full_setup.sql no SQL Editor do Supabase Dashboard.'
        );
      } else if (selectError.code === '42501' || selectError.message?.includes('permission')) {
        console.error(
          '[Supabase Diagnostic] ❌ RLS blocking SELECT on profiles!\n' +
          '  → Execute o arquivo fitverse_full_setup.sql no SQL Editor do Supabase Dashboard.'
        );
      } else {
        console.error('[Supabase Diagnostic] ❌ profiles SELECT error:', selectError.code, selectError.message);
      }
    } else {
      console.log('[Supabase Diagnostic] ✅ profiles table accessible (SELECT OK)');
    }

    // Test 2: Can we read storage buckets?
    const { data: buckets, error: bucketError } = await withTimeout(
      supabase.storage.listBuckets(),
      5000
    );
    
    if (bucketError) {
      console.error('[Supabase Diagnostic] ❌ Storage error:', bucketError.message);
    } else {
      const names = (buckets || []).map(b => b.name);
      const required = ['avatars', 'videos', 'posts'];
      const missing = required.filter(r => !names.includes(r));
      if (missing.length > 0) {
        console.error(
          `[Supabase Diagnostic] ❌ Missing storage buckets: ${missing.join(', ')}\n` +
          '  → Execute o arquivo fitverse_full_setup.sql no SQL Editor do Supabase Dashboard.'
        );
      } else {
        console.log('[Supabase Diagnostic] ✅ Storage buckets OK:', names.join(', '));
      }
    }
  } catch (err) {
    console.error('[Supabase Diagnostic] ❌ Connection failed (or timed out):', err.message);
  }
})();

export default supabase;

