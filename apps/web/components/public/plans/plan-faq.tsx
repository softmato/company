import { ChevronDown } from 'lucide-react';

/**
 * Questions a visitor has on a plans page with no prices on it. Every answer
 * restates something the site already says elsewhere — the services page's
 * written-scope paragraph, the plans' own yes/no tests — and promises nothing
 * new. Native `<details>`, so it opens without script.
 */
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Which plan is mine?',
    a: (
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>It stays the same after launch: Static.</li>
        <li>You want to update it yourself: Advanced.</li>
        <li>It needs payments or rules of its own: Custom.</li>
      </ol>
    ),
  },
  {
    q: 'Why is there no price?',
    a: 'Every project is different. Before we start, we agree in writing what gets built, what it costs and when it is ready.',
  },
  {
    q: 'Do the plans cover apps as well as websites?',
    a: 'Yes. Every plan covers a website, a mobile app, or both, and each card lists what you get for each.',
  },
  {
    q: 'Do I get the source code?',
    a: 'Yes, on every plan. You own the deliverables once the final invoice is settled, and you get the source code either way.',
  },
];

export function PlanFaq() {
  return (
    <section aria-labelledby="plan-faq" className="mx-auto mt-28 max-w-3xl">
      <h2
        id="plan-faq"
        className="headline text-center text-[clamp(1.6rem,3.4vw,2.2rem)]"
      >
        Questions about plans
      </h2>

      <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-card">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group px-6 py-5 [&_summary]:list-none">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15.5px] font-medium">
              {q}
              <ChevronDown
                className="size-4 flex-none text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-3 text-[15px] leading-relaxed text-foreground/75">
              {a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
