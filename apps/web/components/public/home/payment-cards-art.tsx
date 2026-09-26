import { Drift } from '@/components/motion/drift';
import { cn } from '@/lib/cn';

/**
 * Three payment cards suspended over the wide card, after the reference's
 * floating debit cards, printed like the real thing: brand and card type,
 * chip and contactless, a masked number, holder and expiry, a network mark.
 * The number is masked and the holder is "your customer" — a drawing of a
 * card, not anybody's card.
 *
 * **The card bodies are drawn in CSS for now; the art is on its way.** When
 * the rendered PNGs arrive, each `.pay-card` gets its image as a background and
 * the printing stays on top, so nothing about the motion changes.
 *
 * Three motions, one per nested element so no two tweens share a transform:
 * `Drift` bobs each card on its own period so they never move in step; the
 * card's own transform fans the stack apart when the reader hovers the bento
 * card (`.group:hover` in the CSS); and the tilt is a custom property the hover
 * reads, so the fan is one transition rather than a keyframe.
 */
const LAYERS = [
  {
    tone: 'ink',
    kind: 'Debit',
    last4: '2400',
    expiry: '09/29',
    x: '4%',
    y: '34%',
    tilt: -16,
    fan: -18,
    drift: 10,
    period: 6.5,
  },
  {
    tone: 'glow',
    kind: 'Prepaid',
    last4: '0850',
    expiry: '04/28',
    x: '30%',
    y: '8%',
    tilt: 8,
    fan: 0,
    drift: 14,
    period: 7.8,
  },
  {
    tone: 'glass',
    kind: 'Virtual',
    last4: '1200',
    expiry: '12/30',
    x: '56%',
    y: '30%',
    tilt: 20,
    fan: 22,
    drift: 8,
    period: 5.9,
  },
] as const;

export function PaymentCardsArt({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none', className)}>
      {LAYERS.map((layer) => (
        <div
          key={layer.tone}
          className="absolute w-[44%] max-w-[17rem]"
          style={{ left: layer.x, top: layer.y }}
        >
          <Drift distance={layer.drift} duration={layer.period}>
            <div
              className={cn('pay-card', `pay-card--${layer.tone}`)}
              style={
                {
                  '--tilt': `${layer.tilt}deg`,
                  '--fan': `${layer.fan}px`,
                } as React.CSSProperties
              }
            >
              <div className="pay-card__row">
                <span className="pay-card__brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/mark.png" alt="" />
                  softmato
                </span>
                <span className="pay-card__kind">{layer.kind}</span>
              </div>

              <div className="pay-card__row">
                <span className="pay-card__chip" />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  className="pay-card__wave"
                >
                  <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
                </svg>
              </div>

              <p className="pay-card__number numeric">
                •••• •••• •••• {layer.last4}
              </p>

              <div className="pay-card__row items-end">
                <span>
                  <span className="pay-card__label">Card holder</span>
                  <span className="pay-card__value">Your customer</span>
                </span>
                <span>
                  <span className="pay-card__label">Valid thru</span>
                  <span className="pay-card__value numeric">
                    {layer.expiry}
                  </span>
                </span>
                <span className="pay-card__network" />
              </div>
            </div>
          </Drift>
        </div>
      ))}
    </div>
  );
}
