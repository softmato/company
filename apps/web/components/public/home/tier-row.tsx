import type { Tier, TierSide } from '@/lib/home/tiers';

/**
 * One rung of the scope ladder: the tier's name and its yes/no test on the
 * left, and what it means for a website and for an app in two columns beside.
 *
 * **A ladder, not a pricing table.** There are no figures and no ticks, and the
 * columns are prose rather than a feature matrix, because a matrix invites the
 * reader to count rows and conclude that more rows is better. What decides the
 * tier is the question in `test`, and the answer to it is not a quantity.
 *
 * The `stops` line is the one most likely to be cut and the one that earns the
 * section. Saying what a tier does *not* do is what stops a static build being
 * sold and an advanced one being expected.
 */
function Side({ label, side }: { label: string; side: TierSide }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-4 text-[15px] leading-relaxed">{side.summary}</p>

      <ul className="mt-5 space-y-2">
        {side.includes.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground"
          >
            <span aria-hidden="true" className="mt-2 size-1 flex-none rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-[13.5px] leading-relaxed text-muted-foreground">
        {side.stops}
      </p>
    </div>
  );
}

export function TierRow({ tier, index }: { tier: Tier; index: number }) {
  return (
    <article
      id={`tier-${tier.id}`}
      className="grid gap-8 border-t border-border py-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:py-16"
    >
      <div>
        <p className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </p>

        <h3 className="headline mt-4 text-[clamp(1.6rem,3.2vw,2.4rem)]">
          {tier.name}
        </h3>

        <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-muted-foreground">
          {tier.test}
        </p>
      </div>

      <Side label="Website" side={tier.web} />
      <Side label="App" side={tier.app} />
    </article>
  );
}
