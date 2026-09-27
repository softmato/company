import type { ReactNode } from 'react';

import { Frame, Hub, Node } from '@/components/public/services/service-art';

/**
 * One mark per inner page, in the service and plan marks' hand: monoline ink
 * on a 64 grid, a single hub with the brand dot. Never reused across pages.
 */
const MARKS = {
  /** A page being written, the hub at the nib. */
  blog: (
    <>
      <rect x={8} y={8} width={36} height={46} rx={5} />
      <path d="M16 20h20M16 28h20M16 36h12" />
      <g transform="rotate(35 45 29)">
        <rect
          x={41}
          y={11}
          width={8}
          height={30}
          rx={2.5}
          className="fill-card"
        />
        <path d="M41 41 45 49 49 41" className="fill-card" />
      </g>
      <Hub x={33.5} y={45.4} />
    </>
  ),
  /** The company's building, the hub its emblem. */
  about: (
    <>
      <path d="M4 56h56" />
      <rect x={14} y={8} width={36} height={48} rx={5} />
      <path d="M22 31h6M36 31h6M22 41h6M36 41h6M28 56v-7h8v7" />
      <Hub x={32} y={19} />
    </>
  ),
  /** Scales, balanced on the hub. */
  legal: (
    <>
      <path d="M32 18v36M22 56h20M10 18h44" />
      <path d="M10 18 5 34M10 18l5 16M54 18l-5 16M54 18l5 16" />
      <path d="M3 34h14a7 7 0 0 1-14 0ZM47 34h14a7 7 0 0 1-14 0Z" />
      <Hub x={32} y={18} />
    </>
  ),
  /** Three people, the hub the one in front. */
  team: (
    <>
      <circle cx={14} cy={28} r={5} />
      <circle cx={50} cy={28} r={5} />
      <path d="M3 50a11 11 0 0 1 17-9M61 50a11 11 0 0 0-17-9" />
      <path d="M18 54a14 14 0 0 1 28 0" className="fill-card" />
      <circle cx={32} cy={24} r={8} className="fill-card" />
      <Hub x={32} y={24} />
    </>
  ),
  /** A briefcase, the hub its clasp. */
  careers: (
    <>
      <path d="M24 20v-5a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v5" />
      <rect x={6} y={20} width={52} height={36} rx={6} />
      <path d="M6 36h52" />
      <Hub x={32} y={36} />
    </>
  ),
  /** A speech bubble mid-sentence. */
  contact: (
    <>
      <path d="M12 10h40a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H28L16 56V46h-4a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6Z" />
      <Node x={20} y={28} r={2.5} />
      <Node x={44} y={28} r={2.5} />
      <Hub x={32} y={28} />
    </>
  ),
  /** Two stages meeting in the delivered one. */
  'how-we-work': (
    <>
      <rect x={6} y={8} width={18} height={14} rx={4} />
      <rect x={40} y={8} width={18} height={14} rx={4} />
      <path d="M24 15h16M15 22v19a6 6 0 0 0 6 6h2M49 22v19a6 6 0 0 1-6 6h-2" />
      <rect x={23} y={40} width={18} height={14} rx={4} />
      <Hub x={32} y={47} />
    </>
  ),
  /** Code brackets, the hub on the slash. */
  developers: (
    <>
      <path d="M20 18 6 32l14 14M44 18l14 14-14 14M37 12 27 52" />
      <Hub x={32} y={32} />
    </>
  ),
  /** A dashboard window, the hub the selected item. */
  'client-portal': (
    <>
      <rect x={6} y={10} width={52} height={44} rx={6} />
      <path d="M6 20h52M20 20v34M26 46h14" />
      <rect x={26} y={27} width={26} height={11} rx={2.5} />
      <Hub x={13} y={31} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type PageMark = keyof typeof MARKS;

export function PageArt({
  mark,
  className,
}: {
  mark: PageMark;
  className?: string | undefined;
}) {
  return <Frame className={className}>{MARKS[mark]}</Frame>;
}
