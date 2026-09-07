'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlistFlips } from '@/hooks/useWatchlistFlips';
import { AddItemSearch } from '@/components/AddItemSearch';
import { FlipTable } from '@/components/FlipTable';
import { AlertRuleForm } from '@/components/AlertRuleForm';
import { AlertRulesList } from '@/components/AlertRulesList';
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
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="osrs-panel mb-4 flex items-center justify-between px-4 py-3 sm:mb-6">
        <h1 className="font-display text-2xl text-ledger-bronze sm:text-3xl">Ledger</h1>
        <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
          <button onClick={handleEnablePush} className="text-ledger-bronze hover:text-ledger-parchment hover:underline">
            Enable alerts
          </button>
          <button onClick={handleSignOut} className="text-ledger-muted hover:text-ledger-parchment hover:underline">
            Sign out
          </button>
        </div>
      </header>

      {/* Single column on mobile/tablet; a fixed-width sidebar plus a
          flexible table area from the lg breakpoint up, so wide desktop
          screens actually get used instead of a narrow centered column. */}
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6">
        <div className="mb-4 flex flex-col gap-4 lg:sticky lg:top-6 lg:mb-0">
          <AddItemSearch uid={user.id} />
          <AlertRuleForm uid={user.id} />
          <AlertRulesList uid={user.id} />
        </div>

        <div className="osrs-panel overflow-x-auto px-4 py-3">
          <FlipTable flips={flips} onRemove={removeFromWatchlist} />
        </div>
      </div>
    </main>
  );
}
