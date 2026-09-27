import Link from 'next/link';
import { Globe, Layers, Smartphone } from 'lucide-react';

import type { Tier } from '@/lib/plans/tiers';

import { PlanArt } from './plan-art';
import { PlanFeatures } from './plan-features';

/**
 * One plan: mark, name, who it is for, the price slot, one button, then what
 * it includes. The price slot is kept and the figure left out — scope decides
 * the price. Dark text throughout; the only colour is the mark's hub.
 */
export function PlanCard({
  tier,
  previous,
}: {
  tier: Tier;
  /** The plan this one builds on, for the "Everything in …, plus" line. */
  previous?: string | undefined;
}) {
  return (
    <article
      id={`plan-${tier.id}`}
      className="plan-card flex flex-col rounded-3xl border border-border bg-card p-7 sm:p-8"
    >
      <PlanArt plan={tier.id} className="size-16 text-foreground" />

      <h2 className="headline mt-7 text-[34px] leading-none">{tier.name}</h2>
      <p className="mt-3 text-[16px] leading-snug text-foreground lg:min-h-[2lh]">
        {tier.tagline}
      </p>

      <p className="mt-7 text-[20px] font-semibold text-foreground">
        Priced on scope
      </p>
      <p className="mt-1 text-[14px] text-foreground/70">
        Quoted after we talk it through
      </p>

      <Link
        href="/contact"
        className="mt-7 flex h-11 items-center justify-center rounded-xl bg-foreground text-[15px] font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Get a quote
      </Link>

      <hr className="my-7 border-border" />

      {previous ? (
        <p className="mb-4 text-[15px] font-semibold text-foreground">
          Everything in {previous}, plus:
        </p>
      ) : null}

      <div className="space-y-7">
        <PlanFeatures icon={Globe} label="Website" items={tier.web} />
        <PlanFeatures icon={Smartphone} label="App" items={tier.app} />
        {tier.both ? (
          <PlanFeatures
            icon={Layers}
            label="Website and app"
            items={tier.both}
          />
        ) : null}
      </div>
    </article>
  );
}
