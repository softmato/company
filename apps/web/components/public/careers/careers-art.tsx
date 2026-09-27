import type { ReactNode } from 'react';

import { Hub } from '../services/service-art';

/**
 * One mark per section of the careers page, keyed by its `##` heading, in the
 * about marks' hand. `Markdown` sets each over its heading.
 */
export const CAREERS_MARKS: Record<string, ReactNode> = {
  // Asked why more often than how: a bulb, the hub its filament.
  'What working here is like': (
    <>
      <path d="M24 46c0-8-10-12-10-24a18 18 0 0 1 36 0c0 12-10 16-10 24Z" />
      <path d="M24 52h16M27 58h10" />
      <Hub x={32} y={24} />
    </>
  ),
  // A checklist on a clipboard, the hub its clip.
  'What we look for': (
    <>
      <rect x={12} y={10} width={40} height={48} rx={5} />
      <path d="m20 28 3 3 5-6M33 29h11M20 42l3 3 5-6M33 43h11" />
      <rect x={24} y={6} width={16} height={9} rx={3} className="fill-card" />
      <Hub x={32} y={10.5} />
    </>
  ),
  // Write to us anyway: a letter, the hub where the flap meets.
  'Open roles': (
    <>
      <rect x={6} y={14} width={52} height={36} rx={6} />
      <path d="m9 18 23 17 23-17" />
      <Hub x={32} y={35} />
    </>
  ),
};
