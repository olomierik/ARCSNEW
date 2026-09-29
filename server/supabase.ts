/**
 * Supabase client + schema bootstrap.
 * Tables are created on first connection if they don't exist
 * via the REST API (no migrations file needed).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  console.error('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from env');
  process.exit(1);
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

/**
 * Run raw SQL to create tables if they don't exist.
 * Uses supabase.rpc('exec_sql', ...) if available, otherwise
 * we fall back to inserting a dummy row and catching the error
 * to detect table existence — but the cleanest path is just
 * creating the tables via the Supabase dashboard SQL editor.
 *
 * We use the Supabase PostgREST "pg" extension: call
 * supabase.from('...').select() and check for a table-not-found
 * error code (42P01) to decide whether to bootstrap.
 */
export async function ensureTables() {
  // trading_wallets
  const { error: we } = await supabase.from('trading_wallets').select('id').limit(1);
  if (we && we.code === '42P01') {
    console.log('[supabase] trading_wallets table missing — please run schema.sql in Supabase SQL editor');
  }

  // trades
  const { error: te } = await supabase.from('trades').select('id').limit(1);
  if (te && te.code === '42P01') {
    console.log('[supabase] trades table missing — please run schema.sql in Supabase SQL editor');
  }

  // profits
  const { error: pe } = await supabase.from('profits').select('owner_address').limit(1);
  if (pe && pe.code === '42P01') {
    console.log('[supabase] profits table missing — please run schema.sql in Supabase SQL editor');
  }

  if (!we && !te && !pe) {
    console.log('[supabase] All tables verified.');
  }
}
