'use client';

import { useRef, type ReactNode, type Ref } from 'react';

import { BrandMark } from '@/components/brand/brand-mark';
import { AnimatedBeam } from '@/components/motion/animated-beam';
import { WALLET_MARKS } from '@/lib/brand/wallet-marks';
import { cn } from '@/lib/cn';

import { PaymentGlyph, type PaymentGlyphName } from './payment-glyphs';

const WALLETS = [WALLET_MARKS.esewa, WALLET_MARKS.khalti, WALLET_MARKS.fonepay];

/* Where the client's customers pay: their own products, not our back office. */
const OUTCOMES: { label: string; glyph: PaymentGlyphName }[] = [
  { label: 'Your website', glyph: 'website' },
  { label: 'Your app', glyph: 'mobile' },
  { label: 'Your software', glyph: 'webhook' },
];

/* `--border` vanished on the tinted card; the founder asked for darker lines. */
const BEAM = {
  pathColor: 'var(--foreground)',
  pathOpacity: 0.22,
  pathWidth: 2,
  gradientStopColor: 'var(--cobalt)',
};

/** Top, middle and bottom row: the outer two bow toward the hub. */
const CURVES = [
  { curvature: -75, endYOffset: -10 },
  { curvature: 0, endYOffset: 0 },
  { curvature: 75, endYOffset: 10 },
];

/**
 * Wallets on the left, Softmato in the middle, the client's own products on
 * the right: we wire the wallets into what they already run. Every beam uses
 * the same left-to-right sweep, so the light crosses the whole diagram as one
 * pass — in through a wallet, out to their website, app or software.
 */
export function PaymentFlow({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const walletRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const outcomeRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  return (
    <figure className={className}>
      <figcaption className="sr-only">
        eSewa, Khalti and Fonepay, wired by Softmato into your website, your
        app and your software.
      </figcaption>

      <div
        ref={containerRef}
        aria-hidden="true"
        className="relative mx-auto flex w-full max-w-xl items-center justify-between"
      >
        <div className="flex flex-col gap-3">
          {WALLETS.map((wallet, i) => (
            <Node key={wallet.label} ref={walletRefs[i]!} label={wallet.label}>
              <BrandMark asset={wallet} size={wallet.ratio ? 18 : 26} />
            </Node>
          ))}
        </div>

        <Node ref={hubRef} label="Softmato" className="size-[4.5rem] p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mark.png"
            alt=""
            className="size-full object-contain"
          />
        </Node>

        <div className="flex flex-col gap-3">
          {OUTCOMES.map((outcome, i) => (
            <Node key={outcome.label} ref={outcomeRefs[i]!} label={outcome.label}>
              <PaymentGlyph name={outcome.glyph} className="text-primary" />
            </Node>
          ))}
        </div>

        {CURVES.map((curve, i) => (
          <AnimatedBeam
            key={`in-${i}`}
            containerRef={containerRef}
            fromRef={walletRefs[i]!}
            toRef={hubRef}
            {...curve}
            {...BEAM}
          />
        ))}
        {CURVES.map((curve, i) => (
          <AnimatedBeam
            key={`out-${i}`}
            containerRef={containerRef}
            fromRef={outcomeRefs[i]!}
            toRef={hubRef}
            {...curve}
            {...BEAM}
          />
        ))}
      </div>
    </figure>
  );
}

function Node({
  ref,
  label,
  className,
  children,
}: {
  ref: Ref<HTMLDivElement>;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        className={cn(
          'z-10 flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
          className,
        )}
      >
        {children}
      </div>
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
    </div>
  );
}
