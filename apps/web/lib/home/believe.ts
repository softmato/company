/**
 * The "What we believe" diagram: what a client sees on the left, what has to
 * be right underneath on the right, Softmato joining the two. The headline
 * above it — software that is right, not software that looks right — is the
 * caption; this is the picture of it.
 *
 * **Every position is in one 1152 × 760 frame** (the section's max width at
 * `lg`). The SVG lines use it as their viewBox and the HTML cards convert it
 * to percentages, so a line always lands on the card it was drawn to at every
 * width the layout takes. Change a card's box here and move its lines with it
 * in `believe-lines.tsx`.
 */
export const FRAME = { w: 1152, h: 760 } as const;

/** The horizontal line the flow runs along. */
export const FLOW_Y = 530;

export interface Box {
  x: number;
  y: number;
  w: number;
  h?: number;
}

/** A box in the frame, as custom properties the `lg:` classes read. */
export function frameVars({ x, y, w, h }: Box): React.CSSProperties {
  return {
    '--fx': `${(x / FRAME.w) * 100}%`,
    '--fy': `${(y / FRAME.h) * 100}%`,
    '--fw': `${(w / FRAME.w) * 100}%`,
    ...(h ? { '--fh': `${(h / FRAME.h) * 100}%` } : {}),
  } as React.CSSProperties;
}

export const BOXES = {
  toggle: { x: 24, y: 70, w: 236 },
  shield: { x: 900, y: 30, w: 228 },
  /** Height is its content; it only has to straddle `FLOW_Y`. */
  see: { x: 140, y: 400, w: 260 },
  /** Three principle nodes: the About page's three beliefs. */
  nodes: [460, 530, 600].map((cy) => ({ x: 460, y: cy - 20, w: 40, h: 40 })),
  hub: { x: 530, y: FLOW_Y - 22, w: 140, h: 44 },
  chip: { x: 815, y: 320, w: 170, h: 36 },
  right: { x: 750, y: 390, w: 300, h: 280 },
} satisfies Record<string, Box | Box[]>;

export interface Asset {
  label: string;
  src: string;
}

/** The part a client sees. */
export const SEE: Asset[] = [
  { label: 'Web', src: '/home/believe/web.webp' },
  { label: 'App', src: '/home/believe/app.webp' },
  { label: 'UI', src: '/home/believe/ui.webp' },
  { label: 'UX', src: '/home/believe/ux.webp' },
];

/** The part that has to be right underneath. Corners of the right card. */
export const RIGHT: Asset[] = [
  { label: 'Server', src: '/home/believe/server.webp' },
  { label: 'Database', src: '/home/believe/database.webp' },
  { label: 'Clients', src: '/home/believe/clients.webp' },
  { label: 'Trust', src: '/home/believe/trust.webp' },
];

export const SHIELD_SRC = '/home/believe/shield.webp';
