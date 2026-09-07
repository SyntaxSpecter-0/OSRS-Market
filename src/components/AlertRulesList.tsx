'use client';

import { useAlertRules, type AlertRule } from '@/hooks/useAlertRules';

function describeRule(rule: AlertRule): string {
  const scope = rule.itemName ?? 'any watchlist item';
  switch (rule.ruleType) {
    case 'margin_pct':
      return `${scope}: margin ≥ ${rule.threshold}%`;
    case 'price_below':
      return `${scope}: buy price ≤ ${rule.threshold.toLocaleString()} gp`;
    case 'price_above':
      return `${scope}: sell price ≥ ${rule.threshold.toLocaleString()} gp`;
    case 'momentum':
      return `${scope}: momentum shift`;
  }
}

export function AlertRulesList({ uid }: { uid: string }) {
  const { rules, removeRule } = useAlertRules(uid);

  if (rules.length === 0) return null;

  return (
    <div className="osrs-panel px-4 py-3">
      <h2 className="mb-2 font-display text-base text-ledger-bronze">Your alert rules</h2>
      <ul className="flex flex-col gap-1">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between text-sm text-ledger-parchment">
            <span>{describeRule(rule)}</span>
            <button
              onClick={() => removeRule(rule.id)}
              className="text-ledger-muted hover:text-sell"
              aria-label="Remove this alert rule"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
