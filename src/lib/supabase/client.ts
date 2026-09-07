import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase instance — used in components for auth + realtime.
//
// Kept as a singleton (created once, reused on every call) rather than a
// fresh instance per call. Several hooks (useWatchlistFlips, useAlertRules)
// put this client in a useEffect dependency array to manage a Realtime
// subscription. If createClient() returned a new object each render, that
// dependency would change every render, tearing down and rebuilding the
// subscription constantly, and Realtime events would never reliably land.
// A stable singleton fixes that for every hook at once.
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
