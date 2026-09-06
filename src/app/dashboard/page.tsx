'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlistFlips } from '@/hooks/useWatchlistFlips';
import { AddItemSearch } from '@/components/AddItemSearch';
import { FlipTable } from '@/components/FlipTable';
import { AlertRuleForm } from '@/components/AlertRuleForm';
import { enablePushNotifications } from '@/lib/firebase/push';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { flips, removeFromWatchlist } = useWatchlistFlips(user?.id);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user) return null;

  async function handleEnablePush() {
    try {
      await enablePushNotifications(user!.id, 'web');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ledger-parchment">Ledger</h1>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={handleEnablePush} className="text-ledger-bronze hover:underline">
            Enable alerts
          </button>
          <button onClick={handleSignOut} className="text-ledger-muted hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <div className="mb-6">
        <AddItemSearch uid={user.id} />
      </div>

      <AlertRuleForm uid={user.id} />

      <FlipTable flips={flips} onRemove={removeFromWatchlist} />
    </main>
  );
}
