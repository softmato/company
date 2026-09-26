'use client';

import Image from 'next/image';
import { useRef } from 'react';

import { BOXES, RIGHT, SEE, frameVars, type Asset } from '@/lib/home/believe';

import { BelieveLines } from './believe-lines';
import { ShieldWidget, ToggleWidget } from './believe-widgets';
import { useBelieveMotion } from './use-believe-motion';

const PLACED =
  'lg:absolute lg:left-[var(--fx)] lg:top-[var(--fy)] lg:w-[var(--fw)] lg:h-[var(--fh)]';

/** Where the four corners of the right card sit, in its own 300 × 280 box. */
const CORNERS = [
  { x: 62, y: 74 },
  { x: 238, y: 74 },
  { x: 62, y: 206 },
  { x: 238, y: 206 },
];
const CORE = { x: 150, y: 140 };

/**
 * What a client sees, joined by Softmato to what has to be right underneath.
 *
 * At `lg` it is one frame: every card is absolutely placed on the numbers in
 * `lib/home/believe.ts` and `BelieveLines` draws between them. Below `lg` the
 * same elements fall into a column with short dashed stubs between them and
 * the wires are not drawn — a route diagram squeezed to 390px is a tangle.
 *
 * The frame starts 240px above its own box at `lg` so the two widgets flank
 * the headline, the way the reference's side cards flank its hero.
 */
export function BelieveFlow() {
  const ref = useRef<HTMLElement>(null);

  useBelieveMotion(ref);

  return (
    <figure
      ref={ref}
      className="believe relative lg:-mt-60 lg:aspect-[1152/760]"
    >
      <figcaption className="sr-only">
        What you see — web, app, UI and UX — joined by Softmato to what makes it
        right underneath: server, database, clients and trust.
      </figcaption>

      <BelieveLines />

      <div
        aria-hidden="true"
        className="believe-dots absolute hidden opacity-60 lg:block"
        style={{ left: '34.7%', top: '56.6%', width: '30.4%', height: '26.3%' }}
      />

      <div className="relative flex flex-col items-center gap-4 lg:static lg:block">
        <div className="grid w-full max-w-md gap-4 sm:grid-cols-2 lg:contents">
          <ToggleWidget />
          <ShieldWidget />
        </div>

        <Stub />

        <div
          data-card="see"
          data-step=""
          className={`section-frame w-full max-w-sm p-4 ${PLACED}`}
          style={frameVars(BOXES.see)}
        >
          <p className="text-[12.5px] font-medium text-muted-foreground">
            What you see
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {SEE.map((asset) => (
              <Tile key={asset.label} asset={asset} />
            ))}
          </ul>
        </div>

        {BOXES.nodes.map((box, i) => (
          <span
            key={i}
            data-node=""
            aria-hidden="true"
            className={`hidden place-items-center rounded-full border border-border bg-card text-primary shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)] lg:grid ${PLACED}`}
            style={frameVars(box)}
          >
            <NodeGlyph index={i} />
          </span>
        ))}

        <Stub />

        <div className={`relative ${PLACED}`} style={frameVars(BOXES.hub)}>
          <span
            aria-hidden="true"
            className="believe-glow believe-hub-glow pointer-events-none absolute -inset-x-10 -inset-y-12"
          />
          <div
            data-hub=""
            data-step=""
            className="relative flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_var(--primary)] lg:h-full"
          >
            <Image
              src="/brand/mark.png"
              alt=""
              width={25}
              height={20}
              className="h-5 w-auto brightness-0 invert"
            />
            softmato
          </div>
        </div>

        <Stub />

        {/* Centred on its wire rather than sized to its box: the label is wider than 170 frame units at 1024px. */}
        <div
          data-chip=""
          data-step=""
          className={`flex items-center justify-center ${PLACED}`}
          style={frameVars(BOXES.chip)}
        >
          <p className="section-frame flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium">
            <span aria-hidden="true" className="size-2 rounded-full bg-glow" />
            What makes it right
          </p>
        </div>

        <div
          data-card="right"
          data-step=""
          className={`section-frame relative aspect-[300/280] w-full max-w-sm ${PLACED}`}
          style={frameVars(BOXES.right)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 300 280"
            fill="none"
            className="absolute inset-0 size-full text-primary"
          >
            {CORNERS.map((c) => (
              <path
                key={`${c.x}-${c.y}`}
                d={`M${CORE.x} ${CORE.y} L${c.x} ${c.y}`}
                data-draw="spoke"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          <span
            data-core=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-border bg-card shadow-[0_12px_30px_-12px_var(--primary)]"
          >
            <Image
              src="/brand/mark.png"
              alt=""
              width={40}
              height={32}
              className="h-7 w-auto"
            />
          </span>

          <ul>
            {RIGHT.map((asset, i) => (
              <li
                key={asset.label}
                className="absolute w-[30%] -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(CORNERS[i]!.x / 300) * 100}%`,
                  top: `${(CORNERS[i]!.y / 280) * 100}%`,
                }}
              >
                <div data-item="" className="flex flex-col items-center gap-1">
                  <Image
                    src={asset.src}
                    alt=""
                    width={64}
                    height={64}
                    sizes="64px"
                    className="size-14 lg:size-16"
                  />
                  <span className="text-[12px] text-muted-foreground">
                    {asset.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}

function Tile({ asset }: { asset: Asset }) {
  return (
    <li
      data-tile=""
      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-strong/60 py-2"
    >
      <Image
        src={asset.src}
        alt=""
        width={64}
        height={64}
        sizes="64px"
        className="size-14"
      />
      <span className="text-[12px] font-medium">{asset.label}</span>
    </li>
  );
}

/** A short dashed wire between stacked pieces, below `lg` only. */
function Stub() {
  return (
    <span
      aria-hidden="true"
      className="h-6 border-l border-dashed border-primary/40 lg:hidden"
    />
  );
}

/** Correct, boring, local: one mark per belief on the About page. */
function NodeGlyph({ index }: { index: number }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (index === 0) {
    return (
      <svg {...common}>
        <path d="m5 12 5 5L20 7" />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg {...common}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}
