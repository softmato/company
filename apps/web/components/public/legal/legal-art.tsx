import type { ReactNode } from 'react';

import { Hub, Node } from '../services/service-art';

/**
 * Marks for the sections of each policy a reader most needs to find, keyed by
 * document slug, then by `##` heading without its number. Drawn in the about
 * marks' hand; `Markdown` sets each over its heading. Most sections get none —
 * a mark on every heading would stop pointing at anything.
 */
export const LEGAL_MARKS: Record<string, Record<string, ReactNode>> = {
  terms: {
    // A receipt, the hub on its total.
    'Fees, invoices and taxes': (
      <>
        <path d="M14 8a2 2 0 0 1 2-2h32a2 2 0 0 1 2 2v50l-6-4-6 4-6-4-6 4-6-4-6 4Z" />
        <path d="M22 18h20M22 26h20M22 38h8" />
        <Hub x={40} y={38} />
      </>
    ),
    // Scales, balanced on the hub.
    'Governing law and disputes': (
      <>
        <path d="M32 18v36M22 56h20M10 18h44" />
        <path d="M10 18 5 34M10 18l5 16M54 18l-5 16M54 18l5 16" />
        <path d="M3 34h14a7 7 0 0 1-14 0ZM47 34h14a7 7 0 0 1-14 0Z" />
        <Hub x={32} y={18} />
      </>
    ),
  },
  privacy: {
    // An ID card, the hub its photo.
    'What we collect': (
      <>
        <rect x={6} y={14} width={52} height={36} rx={6} />
        <circle cx={21} cy={28} r={7.5} />
        <path d="M11 44a10 10 0 0 1 20 0M38 26h12M38 34h12" />
        <Hub x={21} y={28} />
      </>
    ),
    // A padlock, the hub its keyhole.
    'How we protect it': (
      <>
        <path d="M20 28v-8a12 12 0 0 1 24 0v8" />
        <rect x={12} y={28} width={40} height={28} rx={6} />
        <path d="M32 45v5" />
        <Hub x={32} y={41} />
      </>
    ),
  },
  candidates: {
    // An hourglass, the hub at its waist.
    'How long we keep it': (
      <>
        <path d="M16 6h32M16 58h32" />
        <path d="M20 6c0 16 24 16 24 26S20 42 20 58M44 6c0 16-24 16-24 26s24 10 24 26" />
        <Hub x={32} y={32} />
      </>
    ),
    // A circle struck through.
    'What we will never do': (
      <>
        <circle cx={32} cy={32} r={22} />
        <path d="M16.4 47.6 47.6 16.4" />
        <Hub x={32} y={32} />
      </>
    ),
  },
  cookies: {
    // A cookie with a bite out, the hub one of its chips.
    'What we set': (
      <>
        <path d="M54 32A22 22 0 1 1 32 10a8 8 0 0 0 10 10 10 10 0 0 0 12 12Z" />
        <Node x={20} y={26} r={2.5} />
        <Node x={23} y={43} r={2.5} />
        <Node x={41} y={44} r={2.5} />
        <Hub x={33} y={33} />
      </>
    ),
    // A switch, the hub its knob.
    'Controlling cookies': (
      <>
        <rect x={6} y={20} width={52} height={24} rx={12} />
        <circle cx={46} cy={32} r={8} />
        <Hub x={46} y={32} />
      </>
    ),
  },
  refunds: {
    // A calendar: nothing renews by itself.
    Subscriptions: (
      <>
        <rect x={8} y={12} width={48} height={44} rx={6} />
        <path d="M8 24h48M20 6v12M44 6v12" />
        <Node x={20} y={34} r={2} />
        <Node x={32} y={34} r={2} />
        <Node x={44} y={34} r={2} />
        <Node x={20} y={46} r={2} />
        <Node x={32} y={46} r={2} />
        <Hub x={44} y={46} />
      </>
    ),
    // Money back into a wallet, the hub its clasp.
    'How the money comes back': (
      <>
        <path d="M28 4v14M22 12l6 6 6-6" />
        <rect x={6} y={24} width={50} height={32} rx={6} />
        <path d="M56 33H46a7 7 0 0 0 0 14h10" />
        <Hub x={46} y={40} />
      </>
    ),
  },
  sla: {
    // A pulse line running on, the hub where it has got to.
    Availability: (
      <>
        <path d="M4 32h10l7-16 10 32 7-16h16" />
        <Hub x={54} y={32} />
      </>
    ),
    // A voucher, torn along its perforation.
    'Service credits': (
      <>
        <path d="M6 18h52v10a4 4 0 0 0 0 8v10H6V36a4 4 0 0 0 0-8Z" />
        <path d="M42 22v20" strokeDasharray="3 4" />
        <Hub x={24} y={32} />
      </>
    ),
  },
  aup: {
    // A gavel over its block.
    'Nothing illegal under Nepali law': (
      <>
        <g transform="rotate(-45 24 22)">
          <rect x={10} y={15} width={28} height={14} rx={3} />
          <path d="M24 29v28" />
          <Hub x={24} y={22} />
        </g>
        <path d="M38 58h22M42 58v-5h14v5" />
      </>
    ),
    // A bug, the hub on its back.
    'Reporting abuse or a vulnerability': (
      <>
        <path d="M26 20a6 6 0 0 1 12 0M28 14l-3-6M36 14l3-6" />
        <rect x={20} y={20} width={24} height={36} rx={12} />
        <path d="M32 20v36M20 30h-9M20 40h-11M20 50h-9M44 30h9M44 40h11M44 50h9" />
        <Hub x={32} y={36} />
      </>
    ),
  },
  'partner-terms': {
    // A key, the hub its bow.
    Credentials: (
      <>
        <circle cx={20} cy={32} r={12} />
        <path d="M32 32h26M50 32v8M42 32v6" />
        <Hub x={20} y={32} />
      </>
    ),
    // Paused.
    Suspension: (
      <>
        <circle cx={32} cy={32} r={22} />
        <path d="M24 22v20M40 22v20" />
        <Hub x={32} y={32} />
      </>
    ),
  },
};
