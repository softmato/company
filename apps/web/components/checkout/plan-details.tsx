import type { Presentation } from '@/lib/documents/presentation';

/**
 * What the SaaS is selling, on the left of the checkout page.
 *
 * The panel used to say one line — the product name — which answers "who is
 * charging me" but not "for what". A customer who cannot see what they are
 * buying at the moment they are asked to pay for it is a customer who leaves,
 * and the SaaS is the only party that knows the answer. So they send it
 * (`presentation` on `POST /v1/invoices`) and this renders it.
 *
 * **Every word here is the integrator's, and none of it is a figure.** The
 * amount is stated once, by us, from the invoice — `presentation.ts` rejects a
 * price in a feature line for that reason. Nothing in this component can
 * change what is charged; it sits beside the total, never inside it.
 *
 * Renders nothing at all when there is no presentation. The alternative — a
 * placeholder plan name, an invented "Standard" — would be us writing product
 * copy on a customer's payment page for a product we do not sell.
 */
export function PlanDetails({ presentation }: { presentation: Presentation }) {
  const { plan_name, tagline, features, highlights, billing_period } =
    presentation;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] font-medium leading-snug text-white">
          {plan_name}
        </p>
        {tagline ? (
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            {tagline}
          </p>
        ) : null}
        {billing_period ? (
          <p className="mt-2 text-[12px] text-white/40">
            Billing period · {billing_period}
          </p>
        ) : null}
      </div>

      {features?.length ? (
        <ul className="space-y-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/70"
            >
              {/*
                A drawn tick rather than a "✓" character: the checkout page is
                read on Nepali Android handsets whose emoji fonts render that
                glyph in a different weight and colour from the text beside it,
                and a list where every bullet looks slightly different reads as
                broken rather than as a list.
              */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="mt-[3px] h-3.5 w-3.5 shrink-0 text-white/35"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="min-w-0">{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {highlights?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70"
            >
              {highlight}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
