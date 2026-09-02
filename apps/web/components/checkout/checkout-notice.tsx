/**
 * The checkout page when there is nothing to pay: already paid, expired, or
 * cancelled.
 *
 * These are separate renders rather than a banner over a disabled form,
 * because the thing to get right is that a customer looking at a dead session
 * is never shown a pay button. `checkoutView` returns a discriminated union
 * for the same reason — the page cannot reach a payable render without having
 * narrowed to `payable` first.
 *
 * Deliberately no retry action. A customer whose session expired needs a new
 * session, and only the merchant that created the first one can issue it;
 * offering a button that cannot work would be worse than saying so.
 *
 * `returnLink` is the one way out, and it is a link the customer clicks rather
 * than a redirect that happens to them — see `lib/checkout/return-link.ts` for
 * why. It appears on every outcome, including the ones that are not "paid",
 * because someone who has just been told their payment is under review still
 * needs a way back; only the words around it change.
 */
import type { ReturnLink } from '@/lib/checkout/return-link';

type Tone = 'good' | 'neutral';

interface CheckoutNoticeProps {
  tone: Tone;
  title: string;
  body: string;
  invoiceNo: string;
  /** Absent when the session carried no return URL, or its host is no longer
   * registered. The page then renders as it did before this existed. */
  returnLink?: ReturnLink | null;
}

export function CheckoutNotice({
  tone,
  title,
  body,
  invoiceNo,
  returnLink,
}: CheckoutNoticeProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            tone === 'good' ? 'bg-primary/10' : 'bg-muted'
          }`}
        >
          {tone === 'good' ? <Tick /> : <Clock />}
        </div>

        <div className="space-y-1.5">
          <h1 className="headline text-xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>

        {returnLink ? (
          <p>
            <a
              href={returnLink.href}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Return to {returnLink.applicationName}
            </a>
          </p>
        ) : null}

        <p className="numeric text-[11px] text-muted-foreground">{invoiceNo}</p>
      </div>
    </main>
  );
}

function Tick() {
  return (
    <svg
      className="h-8 w-8 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Clock() {
  return (
    <svg
      className="h-8 w-8 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
