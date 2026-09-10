'use client';

import { useState } from 'react';

export function AlertRuleForm({ onSave }: { onSave: (threshold: number) => Promise<void> }) {
  const [threshold, setThreshold] = useState(5);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await onSave(threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="osrs-panel mb-4 flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-ledger-muted">
      <span>Alert me when any watchlist item's margin hits</span>
      <input
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        className="osrs-panel w-16 px-2 py-1 text-ledger-parchment focus:outline-none focus:ring-1 focus:ring-ledger-bronze"
      />
      <span>%</span>
      <button
        onClick={handleSave}
        className="osrs-panel px-3 py-1 font-display text-ledger-bronze hover:text-ledger-parchment"
      >
        {saved ? 'Saved' : 'Save rule'}
      </button>
    </div>
  );
}
