import type { ReactNode } from 'react';

/**
 * One monoline mark per service, drawn in the plan marks' hand (`plan-art`):
 * ink on a 64 grid, open rings filled with the card, and a single hub with
 * the brand dot. Each keeps the silhouette of the icon it replaced, so the
 * service still reads at a glance. A slug with no mark gets a neutral spark,
 * never another service's.
 */
export function Hub({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={5.5} className="fill-card" />
      <circle cx={x} cy={y} r={2} className="fill-primary" stroke="none" />
    </>
  );
}

export function Node({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} className="fill-card" />;
}

const MARKS: Record<string, ReactNode> = {
  'product-engineering': (
    <>
      <path d="M8 32 32 44 56 32" />
      <path d="M8 42 32 54 56 42" />
      <path d="M32 10 56 22 32 34 8 22Z" className="fill-card" />
      <Hub x={32} y={22} />
    </>
  ),
  'web-applications': (
    <>
      <rect x={8} y={12} width={48} height={40} rx={6} />
      <path d="M8 22h48" />
      <Node x={15} y={17} r={2} />
      <Node x={22} y={17} r={2} />
      <path d="M20 44 32 33 44 44" />
      <Node x={20} y={44} />
      <Node x={44} y={44} />
      <Hub x={32} y={33} />
    </>
  ),
  'mobile-apps': (
    <>
      <rect x={18} y={6} width={28} height={52} rx={6} />
      <path d="M28 12h8M18 41h28" />
      <Hub x={32} y={49.5} />
    </>
  ),
  'payment-integration': (
    <>
      <rect x={6} y={14} width={52} height={36} rx={6} />
      <path d="M6 24h52M29 36h18M29 42h11" />
      <Hub x={17} y={39} />
    </>
  ),
  'ui-ux-design': (
    <g transform="rotate(-45 32 31)">
      <path d="M23 46 16 30 32 6 48 30 41 46" />
      <rect x={21} y={46} width={22} height={10} rx={2.5} />
      <path d="M32 6v18.5" />
      <Hub x={32} y={30} />
    </g>
  ),
  seo: (
    <>
      <circle cx={28} cy={28} r={18} />
      <path d="M41 41 56 56M17 34l6-6 5 4 8-9" />
      <Hub x={36} y={23} />
    </>
  ),
  'maintenance-hosting': (
    <>
      <rect x={8} y={10} width={48} height={18} rx={5} />
      <rect x={8} y={36} width={48} height={18} rx={5} />
      <path d="M30 19h16M30 45h16" />
      <Node x={19} y={45} r={2.5} />
      <Hub x={19} y={19} />
    </>
  ),
};

const SPARK = (
  <>
    <path d="M32 8Q34 30 56 32 34 34 32 56 30 34 8 32 30 30 32 8Z" />
    <Hub x={32} y={32} />
  </>
);

export function Frame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function ServiceArt({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return <Frame className={className}>{MARKS[slug] ?? SPARK}</Frame>;
}

/** The scope band's mark: a signed page, the hub where the signature ends. */
export function ScopeArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M38 6H16a6 6 0 0 0-6 6v40a6 6 0 0 0 6 6h32a6 6 0 0 0 6-6V22Z" />
      <path d="M38 6v10a6 6 0 0 0 6 6h10M20 26h14M20 34h24" />
      <path d="M17 48q3-6 6 0t6 0t6 0h8" />
      <Hub x={44} y={48} />
    </Frame>
  );
}
