import { TIERS } from '@/lib/plans/tiers';

import { PlanCard } from './plan-card';

/** The three plans side by side, each building on the one before it. */
export function PlanGrid() {
  return (
    <div className="mt-14 grid gap-5 lg:-mx-4 lg:grid-cols-3 xl:-mx-20">
      {TIERS.map((tier, index) => (
        <PlanCard key={tier.id} tier={tier} previous={TIERS[index - 1]?.name} />
      ))}
    </div>
  );
}
