import { SURFACE, bar, fillRound, ground, label } from './draw';

/**
 * A running application — sidebar, chart, rows. The surface for product
 * engineering.
 *
 * **No figures and no names on it.** The same rule as the drawn still in the
 * services chapter, and for the same reason: an amount on a drawn invoice is the
 * screen's own datum, but a count of active accounts on our own home page reads
 * as our customer count and named rows read as our clients. Bars carry the
 * composition and claim nothing.
 */
export function drawProduct(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ground(ctx, w, h);

  const sideW = 132;

  /* Sidebar. */
  fillRound(ctx, 22, 22, sideW, h - 44, 18, SURFACE.panel);
  fillRound(ctx, 42, 46, 22, 22, 7, SURFACE.glow);
  bar(ctx, 72, 52, 54);
  [0, 1, 2, 3].forEach((i) => {
    const y = 100 + i * 34;
    if (i === 0) fillRound(ctx, 34, y - 8, sideW - 24, 28, 9, SURFACE.panelSoft);
    fillRound(ctx, 44, y, 14, 14, 4, i === 0 ? SURFACE.glow : SURFACE.line);
    bar(ctx, 66, y + 3, i === 0 ? 46 : 38, i === 0 ? SURFACE.glow : SURFACE.line, 7);
  });

  /* Header. */
  const bx = sideW + 46;
  bar(ctx, bx, 46, 150, SURFACE.text, 12);
  fillRound(ctx, w - 132, 40, 96, 30, 15, SURFACE.glow);

  /* Chart. */
  const heights = [0.38, 0.46, 0.42, 0.58, 0.66, 0.61, 0.78, 0.92];
  const chartTop = 100;
  const chartH = 132;
  const colW = (w - bx - 40) / heights.length;
  heights.forEach((value, i) => {
    const barH = chartH * value;
    fillRound(
      ctx,
      bx + i * colW,
      chartTop + chartH - barH,
      colW - 10,
      barH,
      6,
      i === heights.length - 1 ? SURFACE.glow : SURFACE.line,
    );
  });

  /* Rows. */
  ctx.strokeStyle = SURFACE.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, chartTop + chartH + 26);
  ctx.lineTo(w - 40, chartTop + chartH + 26);
  ctx.stroke();

  [0, 1, 2].forEach((i) => {
    const y = chartTop + chartH + 52 + i * 34;
    ctx.fillStyle = SURFACE.panelSoft;
    ctx.beginPath();
    ctx.arc(bx + 13, y, 13, 0, Math.PI * 2);
    ctx.fill();
    bar(ctx, bx + 38, y - 5, 200 - i * 28);
    fillRound(ctx, w - 106, y - 9, 60, 18, 9, i === 2 ? SURFACE.line : SURFACE.panelSoft);
  });

  label(ctx, 'Products', 22, h - 26);
}
