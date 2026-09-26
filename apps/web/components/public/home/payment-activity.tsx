import { BrandMark } from '@/components/brand/brand-mark';
import { AnimatedList } from '@/components/motion/animated-list';
import { WALLET_MARKS } from '@/lib/brand/wallet-marks';
import { ACTIVITY, type ActivityItem } from '@/lib/home/payments-bento';

import { PaymentGlyph } from './payment-glyphs';

/**
 * The feed in the tall card: what happens inside a client's product as
 * payments settle. Wallet rows carry the wallet's real mark; everything that
 * follows carries a glyph on the emerald badge the craft discs use, so the
 * two kinds of row are told apart by colour before they are read.
 */
export function PaymentActivity() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[74%] overflow-hidden px-5 pt-6 [mask-image:linear-gradient(to_bottom,#000_65%,transparent)]"
    >
      <AnimatedList visible={7}>
        {ACTIVITY.map((item, i) => (
          <Row key={i} item={item} />
        ))}
      </AnimatedList>
    </div>
  );
}

function Row({ item }: { item: ActivityItem }) {
  let badge: React.ReactNode;
  let title: string;
  let detail: string;

  if (item.kind === 'payment') {
    const wallet = WALLET_MARKS[item.wallet];
    badge = (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
        <BrandMark asset={wallet} size={wallet.ratio ? 14 : 24} />
      </span>
    );
    title = item.where;
    detail = `${wallet.label} · ${item.amount}`;
  } else {
    badge = (
      <span className="craft-icon size-10 shrink-0 rounded-xl">
        <PaymentGlyph name={item.kind} />
      </span>
    );
    ({ title, detail } = item);
  }

  return (
    <figure className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.12)]">
      {badge}
      <figcaption className="min-w-0">
        <p className="truncate text-[14px] font-medium text-foreground">
          {title}
        </p>
        <p className="numeric truncate text-[12px] text-muted-foreground">
          {detail}
        </p>
      </figcaption>
    </figure>
  );
}
