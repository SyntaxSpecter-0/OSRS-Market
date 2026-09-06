'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function handleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ledger-bg px-6 text-center">
      <div>
        <h1 className="font-display text-5xl text-ledger-parchment">Ledger</h1>
        <p className="mt-2 max-w-sm text-ledger-muted">
          Real-time Grand Exchange margins, momentum, and alerts for the items
          you're watching.
        </p>
      </div>
      <button
        onClick={handleSignIn}
        className="border border-ledger-bronze px-6 py-3 text-ledger-parchment transition hover:bg-ledger-bronze hover:text-ledger-bg"
      >
        Sign in with Google
      </button>
    </main>
  );
}
