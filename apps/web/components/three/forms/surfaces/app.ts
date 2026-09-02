import { SURFACE, bar, fillRound, ground, label } from './draw';

/**
 * A phone. The surface for mobile apps.
 *
 * Portrait against three landscape panels, which is most of how it is told
 * apart at carousel distance. The two things drawn that no website has are the
 * tab bar along the foot and the notification resting over the top — the same
 * two the drawn still in the services chapter leans on.
 */
export function drawApp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ground(ctx, w, h);

  const sx = 34;
  const sw = w - 68;

  /* Screen. */
  fillRound(ctx, sx, 34, sw, h - 110, 30, SURFACE.panel);

  /* Notch and status row. */
  fillRound(ctx, w / 2 - 34, 46, 68, 14, 7, SURFACE.ground);
  ctx.fillStyle = SURFACE.muted;
  ctx.font = '400 14px Inter, "Segoe UI", system-ui, sans-serif';
  ctx.fillText('9:41', sx + 22, 58);

  bar(ctx, sx + 22, 86, 96, SURFACE.text, 10);

  /* Home grid — six tiles, the first lit. */
  const cols = 3;
  const gap = 12;
  const tile = (sw - 44 - gap * (cols - 1)) / cols;
  for (let i = 0; i < 6; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sx + 22 + col * (tile + gap);
    const y = 118 + row * (tile + gap);

    fillRound(
      ctx,
      x,
      y,
      tile,
      tile,
      14,
      i === 0 ? SURFACE.glow : SURFACE.panelSoft,
    );
    fillRound(
      ctx,
      x + tile / 2 - 11,
      y + tile / 2 - 11,
      22,
      22,
      6,
      i === 0 ? SURFACE.ground : SURFACE.core,
    );
  }

  /* Rows. */
  const listY = 118 + 2 * (tile + gap) + 18;
  [0, 1, 2].forEach((i) => {
    const y = listY + i * 30;
    ctx.fillStyle = SURFACE.panelSoft;
    ctx.beginPath();
    ctx.arc(sx + 32, y + 4, 11, 0, Math.PI * 2);
    ctx.fill();
    bar(ctx, sx + 52, y - 2, sw - 120 - i * 30);
  });

  /* Tab bar. */
  const tabY = h - 110;
  fillRound(ctx, sx, tabY, sw, 42, 0, SURFACE.panelSoft);
  [0, 1, 2, 3].forEach((i) => {
    fillRound(
      ctx,
      sx + sw * (0.16 + i * 0.23) - 10,
      tabY + 13,
      20,
      18,
      5,
      i === 0 ? SURFACE.glow : SURFACE.line,
    );
  });

  /* Notification, straddling the top edge. */
  fillRound(ctx, 14, 12, w - 28, 46, 14, SURFACE.panelSoft);
  fillRound(ctx, 30, 24, 22, 22, 6, SURFACE.glow);
  bar(ctx, 62, 26, 90, SURFACE.text, 7);
  bar(ctx, 62, 40, 150);

  label(ctx, 'Apps', 34, h - 26);
}
