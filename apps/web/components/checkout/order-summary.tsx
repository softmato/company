/**
 * The dark half of the checkout page: what is being bought and for how much.
 *
 * A server component with no state, so the figures come from the session and
 * cannot drift. It renders on the payable page and on every terminal one —
 * a customer looking at an expired session should still see which invoice it
 * was for.
 *
 * The amount is formatted by `formatPaisa`, which divides in `bigint`. The
 * component this replaces did `Number(minor) / 100`, which is a float and
 * silently loses precision above 2^53 paisa; more immediately, it grouped
 * digits in thousands rather than the lakh/crore grouping every invoice and
 * ledger screen in the app uses.
 */
import { PlanDetails } from '@/components/checkout/plan-details';
import { Wordmark } from '@/components/public/wordmark';
import type { Presentation } from '@/lib/documents/presentation';
import { formatPaisa } from '@/lib/format/money';

interface OrderSummaryProps {
  productName: string;
  invoiceNo: string;
  sessionId: string;
  amountMinor: bigint;
  currency: string;
  /** The SaaS's own description of the plan. `null` when they sent none. */
  presentation?: Presentation | null;
}

export function OrderSummary({
  productName,
  invoiceNo,
  sessionId,
  amountMinor,
  currency,
  presentation = null,
}: OrderSummaryProps) {
  const amount = formatPaisa(amountMinor);

  return (
    <div className="flex flex-col justify-between bg-ink px-8 py-10 text-white sm:px-12 lg:px-16 lg:py-14">
      <Wordmark className="text-[18px] text-white" />

      <div className="my-auto max-w-md space-y-10">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">
            ✦
          </div>
          <div className="min-w-0 flex-1">
            {/*
              The product name is ours — it is the row in `products` the
              invoice was raised against. The plan name below is the SaaS's.
              Both are shown because they answer different questions: which
              service this is, and which plan of it was bought.
            */}
            <p className="text-[15px] font-medium leading-snug">{productName}</p>
            <p className="mt-0.5 text-[13px] text-white/45">{invoiceNo}</p>
          </div>
          <p className="numeric whitespace-nowrap pl-4 text-[15px] font-medium">
            {currency} {amount}
          </p>
        </div>

        {presentation ? (
          <>
            <div className="h-px bg-white/[0.08]" />
            <PlanDetails presentation={presentation} />
          </>
        ) : null}

        <div className="h-px bg-white/[0.08]" />

        {/*
          Subtotal and tax are not shown.

          The previous version printed "Subtotal" equal to the total and
          "Tax 0.00" — both invented, because a session carries one amount and
          no breakdown. An invoice does have those lines, and when the checkout
          page reads them it can show them; until then a fabricated zero on a
          payment page is a statement about someone's tax position.
        */}
        <div className="flex items-baseline justify-between">
          <span className="text-base font-semibold">Total due</span>
          <span className="numeric text-2xl font-semibold tracking-tight">
            {currency} {amount}
          </span>
        </div>
      </div>

      <p className="numeric mt-10 text-[11px] text-white/30">
        {sessionId.slice(0, 20)}…
      </p>
    </div>
  );
}
