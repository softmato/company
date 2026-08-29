import { SURFACE, bar, fillRound, ground, label, strokeRound } from './draw';

/**
 * A browser window. The surface for websites.
 *
 * The window bar with an address in it is the whole identification — it is the
 * one thing on this carousel that a phone and a dashboard cannot also be. Same
 * reasoning as the drawn still in the services chapter, and the same address:
 * ours, never a plausible client's.
 */
export function drawWebsite(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ground(ctx, w, h);

  /* Window bar. */
  fillRound(ctx, 22, 22, w - 44, 46, 12, SURFACE.panel);
  [0, 1, 2].forEach((i) => {
    ctx.fillStyle = SURFACE.line;
    ctx.beginPath();
    ctx.arc(48 + i * 20, 45, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  fillRound(ctx, 118, 33, w - 160, 24, 12, SURFACE.panelSoft);
  ctx.fillStyle = SURFACE.muted;
  ctx.font = '400 15px Inter, "Segoe UI", system-ui, sans-serif';
  ctx.fillText('softmato.com', 134, 50);

  /* Page. */
  bar(ctx, 42, 104, 150, SURFACE.text, 11);
  bar(ctx, w - 210, 106, 48);
  bar(ctx, w - 150, 106, 48);
  bar(ctx, w - 90, 106, 48);

  bar(ctx, 42, 150, 300, SURFACE.text, 14);
  bar(ctx, 42, 180, 420);
  bar(ctx, 42, 204, 340);

  fillRound(ctx, 42, 238, 132, 34, 17, SURFACE.glow);

  const cardW = (w - 84 - 32) / 3;
  [0, 1, 2].forEach((i) => {
    const x = 42 + i * (cardW + 16);
    fillRound(ctx, x, 296, cardW, 96, 14, SURFACE.panel);
    fillRound(ctx, x + 16, 314, 22, 22, 7, SURFACE.glow);
    bar(ctx, x + 16, 348, cardW - 50);
    bar(ctx, x + 16, 366, cardW - 80);
  });

  strokeRound(ctx, 42, 296, cardW, 96, 14, SURFACE.glow, 2);
  label(ctx, 'Websites', 42, h - 26);
}
