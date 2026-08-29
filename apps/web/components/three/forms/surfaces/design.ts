import { SURFACE, bar, fillRound, ground, label, strokeRound } from './draw';

/**
 * An artboard mid-edit — grid, a selected frame with handles, a cursor. The
 * surface for interface design.
 *
 * This is the one panel that is *not* a picture of a finished thing. The other
 * three show what gets shipped; this one shows the tool it is shipped from, and
 * the selection handles are what say so. A rendered mockup here would be a
 * fourth finished screen and the carousel would say the same thing four times.
 */
export function drawDesign(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ground(ctx, w, h);

  /* Grid. */
  ctx.strokeStyle = SURFACE.line;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let x = 22; x < w - 22; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, h - 22);
    ctx.stroke();
  }
  for (let y = 22; y < h - 22; y += 34) {
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(w - 22, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* Toolbar. */
  fillRound(ctx, 22, 22, w - 44, 40, 12, SURFACE.panel);
  [0, 1, 2, 3].forEach((i) => {
    fillRound(ctx, 40 + i * 34, 33, 18, 18, 5, i === 1 ? SURFACE.glow : SURFACE.line);
  });

  /* Two frames being laid out. */
  fillRound(ctx, 46, 96, 200, 150, 16, SURFACE.panel);
  bar(ctx, 66, 118, 100, SURFACE.text, 10);
  bar(ctx, 66, 142, 150);
  bar(ctx, 66, 162, 120);
  fillRound(ctx, 66, 190, 88, 26, 13, SURFACE.glow);

  /* The selected frame, with handles. */
  const sx = 286;
  const sy = 96;
  const sw = 210;
  const sh = 200;

  fillRound(ctx, sx, sy, sw, sh, 16, SURFACE.panelSoft);
  fillRound(ctx, sx + 20, sy + 22, 60, 60, 12, SURFACE.glow);
  bar(ctx, sx + 20, sy + 100, 140, SURFACE.text, 10);
  bar(ctx, sx + 20, sy + 124, 170);
  bar(ctx, sx + 20, sy + 144, 110);
  fillRound(ctx, sx + 20, sy + 168, 92, 24, 12, SURFACE.line);

  strokeRound(ctx, sx - 6, sy - 6, sw + 12, sh + 12, 20, SURFACE.core, 2);
  [
    [sx - 6, sy - 6],
    [sx + sw + 6, sy - 6],
    [sx - 6, sy + sh + 6],
    [sx + sw + 6, sy + sh + 6],
  ].forEach(([hx, hy]) => {
    ctx.fillStyle = SURFACE.core;
    ctx.beginPath();
    ctx.arc(hx as number, hy as number, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  /* Cursor. */
  ctx.fillStyle = SURFACE.text;
  ctx.beginPath();
  ctx.moveTo(sx + sw - 34, sy + sh - 26);
  ctx.lineTo(sx + sw - 34, sy + sh + 22);
  ctx.lineTo(sx + sw - 21, sy + sh + 9);
  ctx.lineTo(sx + sw - 4, sy + sh + 6);
  ctx.closePath();
  ctx.fill();

  label(ctx, 'Interfaces', 22, h - 26);
}
