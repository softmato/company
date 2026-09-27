import type { ReactNode } from 'react';

import { Frame, Hub, Node } from './services/service-art';

/**
 * The after-launch marks — domain, hosting, updates, security patches,
 * backups, support — drawn in the services and plans hand: ink on a 64 grid,
 * 1.75 stroke, one hub with the brand dot. New drawings, not the plan-care
 * Lucide icons, so no page shows another page's asset.
 */
const MARKS = {
  domain: (
    <>
      <circle cx={32} cy={32} r={22} />
      <path d="M10 32h44M32 10c-9 7-9 37 0 44M32 10c9 7 9 37 0 44" />
      <Hub x={32} y={32} />
    </>
  ),
  hosting: (
    <>
      <path d="M20 44h25a10 10 0 0 0 1-20 14 14 0 0 0-27-3 11.5 11.5 0 0 0 1 23Z" />
      <path d="M32 44v8" />
      <Hub x={32} y={54} />
    </>
  ),
  updates: (
    <>
      <path d="M50 26a19 19 0 0 0-35-5M14 38a19 19 0 0 0 35 5" />
      <path d="M14 11v10h10M50 53V43H40" />
      <Hub x={32} y={32} />
    </>
  ),
  security: (
    <>
      <path d="M32 6 52 13v17c0 13-9 22-20 27-11-5-20-14-20-27V13Z" />
      <path d="m22 30 8 8 13-14" />
      <Hub x={30} y={38} />
    </>
  ),
  backups: (
    <>
      <ellipse cx={32} cy={14} rx={20} ry={7} />
      <path d="M12 14v36c0 4 9 7 20 7s20-3 20-7V14" />
      <path d="M12 26c0 4 9 7 20 7s20-3 20-7M12 38c0 4 9 7 20 7s20-3 20-7" />
      <Node x={32} y={14} r={2} />
      <Hub x={32} y={45} />
    </>
  ),
  support: (
    <>
      <circle cx={32} cy={32} r={22} />
      <path d="m16.4 16.4 9.2 9.2M38.4 38.4l9.2 9.2M47.6 16.4l-9.2 9.2M25.6 38.4l-9.2 9.2" />
      <circle cx={32} cy={32} r={9} className="fill-card" />
      <Hub x={32} y={32} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type CareKind = keyof typeof MARKS;

export function CareArt({
  kind,
  className,
}: {
  kind: CareKind;
  className?: string;
}) {
  return <Frame className={className}>{MARKS[kind]}</Frame>;
}
