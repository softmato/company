import { BrandMark } from '@/components/brand/brand-mark';
import { ElectricBorder } from '@/components/motion/electric-border';
import { WALLET_MARKS } from '@/lib/brand/wallet-marks';
import { SHIPPED } from '@/lib/home/how-we-work';
import { cn } from '@/lib/cn';

const OPTIONS = [WALLET_MARKS.esewa, WALLET_MARKS.khalti, WALLET_MARKS.fonepay];

/**
 * Beat three, at the centre of the horizon: the checkout the client asked
 * about, with eSewa now in it and selected, marked Live. It is the request
 * card's drawing finished — the dashed slot is filled — so the eye can close
 * the loop without reading a word. The one lit object in the composition,
 * so it carries the electric border.
 */
export function WorkShippedCard() {
  return (
    <ElectricBorder
      className="float-card w-[21rem] max-w-full p-5"
      color="var(--glow)"
      speed={0.5}
      chaos={0.07}
      borderRadius={20}
    >
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-foreground">
          {SHIPPED.title}
        </p>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">
          <span className="live-dot size-1.5 rounded-full bg-primary" />
          {SHIPPED.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map((wallet, i) => (
          <span
            key={wallet.label}
            className={cn(
              'relative flex h-14 items-center justify-center rounded-xl border bg-card',
              i === 0
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border',
            )}
          >
            <BrandMark asset={wallet} size={wallet.ratio ? 20 : 32} />
            {i === 0 && (
              <svg
                viewBox="0 0 16 16"
                className="absolute -right-1.5 -top-1.5 size-4"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="7.5" fill="var(--primary)" />
                <path
                  d="m4.8 8.2 2.1 2.1 4.2-4.4"
                  fill="none"
                  stroke="var(--primary-foreground)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        ))}
      </div>

      <span className="mt-4 flex h-11 items-center justify-center rounded-xl bg-foreground text-[13.5px] font-medium text-background">
        Pay <span className="numeric ml-1.5">{SHIPPED.amount}</span>
      </span>
    </ElectricBorder>
  );
}
