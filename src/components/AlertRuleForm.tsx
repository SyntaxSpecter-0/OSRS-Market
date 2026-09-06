'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AlertRuleForm({ uid }: { uid: string }) {
  const [threshold, setThreshold] = useState(5);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const supabase = createClient();
    await supabase.from('alert_rules').insert({
      user_id: uid,
      item_id: null, // applies to anything on the watchlist
      rule_type: 'margin_pct',
      threshold,
      enabled: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mb-6 flex items-center gap-3 text-sm text-ledger-muted">
      <span>Alert me when any watchlist item's margin hits</span>
      <input
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        className="w-16 border border-ledger-line bg-ledger-panel px-2 py-1 text-ledger-parchment focus:border-ledger-bronze focus:outline-none"
      />
      <span>%</span>
      <button
        onClick={handleSave}
        className="border border-ledger-bronze px-3 py-1 text-ledger-bronze hover:bg-ledger-bronze hover:text-ledger-bg"
      >
        {saved ? 'Saved' : 'Save rule'}
      </button>
    </div>
  );
}
