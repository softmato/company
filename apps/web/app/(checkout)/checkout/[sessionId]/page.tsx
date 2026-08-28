/**
 * payment.softmato.com/checkout/<sessionId>
 *
 * Still a placeholder. Session lookup, expiry handling and provider selection
 * by amount are Phase 3, and **no payment path is opened here.**
 *
 * The screen is styled rather than left raw because it is reachable: a link
 * built against the API today lands on it. What it must not do is *look* like
 * a checkout — an amount, a plan card or a method picker rendered from
 * nothing would be a page inviting someone to pay into a flow that cannot
 * take their money.
 */
import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wordmark } from '@/components/public/wordmark';

export default async function CheckoutPage({
  params,
}: PageProps<'/checkout/[sessionId]'>) {
  const { sessionId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-6 py-20">
      <Wordmark />

      <Card className="mt-5 px-6 py-6">
        <h1 className="headline text-[22px]">Payments are not open yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This checkout cannot take a payment. If someone sent you here
          expecting to pay, contact them before sending money by any other
          route.
        </p>

        {/* Session ids are unguessable but not secret — they are in the URL. */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="eyebrow">Session</p>
          <p className="numeric mt-1.5 break-all text-[13px] text-muted-foreground">
            {sessionId}
          </p>
        </div>
      </Card>

      <Link
        href="/contact"
        className={buttonClasses('secondary', 'touch', 'mt-4 w-full')}
      >
        Get in touch
      </Link>
    </main>
  );
}
