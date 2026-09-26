import { BrandMark } from '@/components/brand/brand-mark';
import { WALLET_MARKS } from '@/lib/brand/wallet-marks';
import { REQUEST } from '@/lib/home/how-we-work';

import { WorkAvatar } from './work-avatar';

/**
 * Beat one: the client asks for a change. The message, and under it the
 * thing they are asking about — their checkout, with the two wallets it takes
 * today and an empty dashed slot where eSewa should go. The picture says
 * "add this here" before the words are read.
 */
export function WorkRequestCard() {
  return (
    <div className="float-card w-[16.5rem] p-3.5">
      <div className="flex items-start gap-2.5">
        <WorkAvatar who="client" className="size-9" />
        <p className="rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[13px] leading-snug text-foreground">
          {REQUEST}
        </p>
      </div>

      {/* Their checkout, drawn. */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <div className="flex gap-1 border-b border-border bg-surface px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2.5">
          {[WALLET_MARKS.khalti, WALLET_MARKS.fonepay].map((wallet) => (
            <span
              key={wallet.label}
              className="flex h-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <BrandMark asset={wallet} size={wallet.ratio ? 14 : 24} />
            </span>
          ))}
          <span className="request-slot flex h-9 items-center justify-center gap-1 rounded-lg border border-dashed border-primary/60 bg-primary/5">
            <BrandMark asset={WALLET_MARKS.esewa} size={20} />
            <span className="text-[13px] font-semibold leading-none text-primary">
              +
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
