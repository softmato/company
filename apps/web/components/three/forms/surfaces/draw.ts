/**
 * The 2D drawing helpers the showcase surfaces share.
 *
 * **Why the surfaces are canvas textures and not geometry.** Each one is a
 * drawing of an interface — a browser window, a phone, a dashboard, an artboard
 * — and built out of meshes that is forty or fifty small planes per panel, two
 * hundred draw calls for four panels, all of it behind a call to action. Drawn
 * once into a 2D canvas and mapped onto a single plane it is four draw calls,
 * it is pixel-crisp rather than depth-fighting, and it can carry a word.
 *
 * Everything here is drawn once, at mount. Nothing in this file runs per frame.
 */

/** The surface palette. Same values as `--ink`, `--glow*` and the dark-band text. */
/**
 * The surface palette.
 *
 * Read against the near-black band these are drawn on, not on their own. The
 * first values were the literal `--ink`/`--glow` family and the panels vanished
 * into the ground: a dark drawing on a dark section, at the size the carousel
 * shrank to, is a smudge. Each step here is lifted a little off the token it
 * comes from so the front panel is legible at about 200 pixels wide, which is
 * the size this thing is actually seen at.
 */
export const SURFACE = {
  ground: '#0a2019',
  panel: '#123128',
  panelSoft: '#173b30',
  line: '#2c6350',
  glow: '#12be7e',
  core: '#6bf7b8',
  text: '#eaf6ef',
  muted: '#93bfab',
} as const;

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A filled rounded rectangle. The unit every one of these drawings is made of. */
export function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

export function strokeRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  width = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

/** A line of "text" as a bar. Cheaper to read than lorem at this size. */
export function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string = SURFACE.line,
  h = 8,
): void {
  fillRound(ctx, x, y, w, h, h / 2, color);
}

/**
 * The panel's own label, bottom-left.
 *
 * Set in whatever the page already has — `next/font` has loaded Inter by the
 * time this draws, and a canvas can use a loaded webfont by family name. The
 * fallback stack is there because a texture drawn before the font settles would
 * otherwise be drawn in the browser's default serif and stay that way: this is
 * painted once, so there is no second chance to get it right.
 */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 26,
): void {
  ctx.fillStyle = SURFACE.text;
  ctx.font = `500 ${size}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** Fills the whole texture with the panel ground and its hairline edge. */
export function ground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.clearRect(0, 0, w, h);
  fillRound(ctx, 0, 0, w, h, 26, SURFACE.ground);
  strokeRound(ctx, 1, 1, w - 2, h - 2, 25, SURFACE.line, 2);
}
