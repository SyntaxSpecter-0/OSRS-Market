'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ledger-bg px-6 text-center">
      <div>
        <h1 className="font-display text-5xl text-ledger-bronze">Ledger</h1>
        <p className="mt-2 max-w-sm text-ledger-muted">
          Real-time Grand Exchange margins, momentum, and alerts for the items
          you're watching.
        </p>
      </div>

      {status === 'sent' ? (
        <p className="osrs-panel max-w-sm px-4 py-3 text-ledger-parchment">
          Check your email for a sign-in link. You can close this tab.
        </p>
      ) : (
        <form onSubmit={handleSendLink} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="osrs-panel px-3 py-2 text-ledger-parchment placeholder:text-ledger-muted focus:outline-none focus:ring-1 focus:ring-ledger-bronze"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="osrs-panel px-6 py-3 font-display text-lg text-ledger-bronze transition hover:text-ledger-parchment disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
          {status === 'error' && (
            <p className="text-sell text-sm">Something went wrong. Try again.</p>
          )}
        </form>
      )}
    </main>
  );
}
