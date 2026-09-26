/**
 * The art on the wall's unnamed tiles: the founder's 3D icons, each on a
 * ground in its own colour. Illustrations of things we build, never faces or
 * logos — those would be claims about customers.
 *
 * Order is the order the tiles are filled, left to right, top to bottom, so
 * neighbours are kept in different hues. The middle three (index 4–6) are the
 * ones a phone shows.
 */
export const TRUSTED_ART = [
  { src: '/home/believe/web.webp', tint: '#3b82f6' },
  { src: '/home/believe/clients.webp', tint: '#f97316' },
  { src: '/home/believe/app.webp', tint: '#8b5cf6' },
  { src: '/home/believe/trust.webp', tint: '#f59e0b' },
  { src: '/home/believe/ui.webp', tint: '#ec4899' },
  { src: '/home/believe/database.webp', tint: '#06b6d4' },
  { src: '/home/believe/server.webp', tint: '#6366f1' },
  { src: '/home/believe/shield.webp', tint: '#10b981' },
  { src: '/home/believe/ux.webp', tint: '#a855f7' },
  { src: '/home/disciplines/uiux.webp', tint: '#0ea5e9' },
  { src: '/home/disciplines/apps.webp', tint: '#22c55e' },
] as const;

export type TrustedArt = (typeof TRUSTED_ART)[number];
