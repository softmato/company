/**
 * Green particles rising off the footer's emerald horizon and fading out as
 * they climb into the footer.
 *
 * Animate UI's `stars` background, reduced to what it does here. The original
 * scatters 1,600 box-shadow dots over a 4000px square and scrolls each layer
 * up with `motion`; this keeps the layered box-shadow trick and the upward
 * drift, and drops the rest:
 *
 *   - **CSS keyframes, not `motion`** — a linear translate on a loop is the
 *     one thing CSS animation was made for, and UI_BRIEF §6 rules out an
 *     animation library. No JavaScript ships for this at all.
 *   - **Seeded, not `Math.random()`** — the same scatter on the server and the
 *     client, so it renders in the HTML instead of popping in after hydration.
 *   - **Sized to the footer** — x in `vw` across the width it actually covers,
 *     y over one loop height, so each layer is a footer-sized texture and not
 *     a 4000px one mostly off-screen to the left.
 *   - **No mouse parallax.** The footer's links sit on top of it.
 *
 * Each layer holds its dots twice, one loop height apart, and slides up by
 * exactly one loop: the second copy lands where the first started, so the loop
 * has no seam. `LOOP` must be at least the footer's height or the top of the
 * footer empties out before the wrap — it stacks to ~900px on a phone.
 *
 * `.footer-stars` masks the lot so the particles are densest where they leave
 * the horizon and gone before they reach the links.
 */
const LOOP = 1000;

/*
 * Small and fast to large and slow, as in the original — distance reads as
 * speed. Counts are per loop height across the full width. On the light
 * ground `--glow-core` does not read at all, so the dots are `--glow`, kept
 * small and unblurred so they stay crisp; only the largest is a soft bokeh.
 */
const LAYERS = [
  { size: 2, count: 90, duration: 22, blur: 0, color: 'var(--glow)' },
  { size: 3, count: 44, duration: 36, blur: 0, color: 'var(--glow)' },
  {
    size: 5,
    count: 18,
    duration: 54,
    blur: 2,
    color: 'color-mix(in oklab, var(--glow) 60%, transparent)',
  },
];

/* Park–Miller: one line, and deterministic across server and client. */
function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function scatter(
  { count, blur, color }: (typeof LAYERS)[number],
  random: () => number,
) {
  return Array.from({ length: count }, () => {
    const x = (random() * 100).toFixed(1);
    const y = Math.round(random() * LOOP);
    return `${x}vw ${y}px ${blur}px ${color}`;
  }).join(',');
}

export function FooterStars() {
  const random = seeded(20260924);

  return (
    <div
      aria-hidden="true"
      className="footer-stars pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {LAYERS.map((layer) => (
        <div
          key={layer.size}
          className="footer-stars-layer"
          style={
            {
              '--loop': `${LOOP}px`,
              '--stars': scatter(layer, random),
              animationDuration: `${layer.duration}s`,
            } as React.CSSProperties
          }
        >
          <span style={{ width: layer.size, height: layer.size }} />
          <span style={{ width: layer.size, height: layer.size, top: LOOP }} />
        </div>
      ))}
    </div>
  );
}
