'use client';

import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

import { HERO } from './hero-timing';

/**
 * The hero's light-form: one enormous bowl of light behind the wordmark.
 *
 * **This draws the arc and nothing else.** The company name used to be part of
 * this component, with each letter placed at its own computed point on the
 * circle — which put 242px of vertical swing across one eight-letter word and
 * made it read as eight glyphs scattered near a curve rather than as a name.
 * The reference keeps its wordmark dead level and lets the light pass behind
 * it. Curve and text are two objects, so they are two components now; see
 * `hero-wordmark.tsx`.
 *
 * The arc is deliberately far bigger than the word it sits behind. Sized to
 * the word it reads as an underline — a smile drawn under a logo. The
 * reference's circle is wider than the viewport and its arms run off the top
 * of the screen, so what you see is a horizon, and the section is clipped
 * rather than composed. Hence a viewBox that ends where the arms leave the
 * frame instead of where the geometry does.
 *
 * **The drawing is split in two, and the split is load-bearing.**
 *
 *   - `[data-arc-shape]` is the bare filament and core. No filter, so it is
 *     free to move: it does the shallow-crescent-to-deep-bowl morph and the
 *     DrawSVG run.
 *   - `[data-arc-bloom]` is the three blurred layers. It never moves. It only
 *     fades.
 *
 * That division is what keeps the entrance from locking the tab. A Gaussian
 * blur is rasterised into a cache, and any geometry change under it — a
 * transform, or DrawSVG rewriting `stroke-dasharray` — discards that cache and
 * re-blurs from scratch, every frame. Opacity does not: it is applied when the
 * cached layer is composited. So the half that moves carries no filter, and
 * the half that carries filters only ever changes its alpha.
 *
 * It is also the more faithful arrangement, which is the happy part. Sampling
 * the reference at 30fps shows its geometry settling at 0.34s while its
 * brightness goes on climbing until 0.9s — two clocks, which is precisely what
 * this split produces.
 *
 * A short bright **head runs out along each arm** on top of all that, built as
 * two more copies of the path with a moving DrawSVG window, so they follow the
 * curve exactly by construction.
 */

/*
 * The circle, in viewBox units.
 *
 * **`CENTER_Y` is negative, and that is the whole point.** The equator — the
 * circle's widest point — has to sit *above* the top of the frame. With it
 * inside the frame the two arms reach their widest and then curve back toward
 * each other on the way up, and on a tall viewport the arc visibly closes into
 * an ellipse: a left border, a right border and a bottom, framing the page
 * like a box. The reference never shows that, because its arms are still
 * spreading outward at the moment they leave the top edge — which is what
 * makes the eye read a circle far bigger than the screen rather than a shape
 * with a top to it.
 *
 * At exactly zero the equator sits on the frame's top edge: the arms are still
 * at their widest as they leave, and there is no inward curve anywhere in the
 * visible run. The radius is then half the viewBox width, which puts the arms
 * at roughly 10% and 90% of the section — far enough in to read as a curve
 * passing through. Pushed out to the very edges they stop being arms and
 * become a left and a right border, which with the bowl closing the bottom is
 * what made the page look like a box in a frame.
 */
const CENTER_X = 560;
const CENTER_Y = 0;
const RADIUS = 560;

/*
 * Where the arc leaves the top of the frame: the circle's two crossings of
 * y = 0. Everything above that is off-stage, so the viewBox stops there and
 * the section's `overflow: clip` does the rest.
 */
const EXIT_DX = Math.sqrt(RADIUS ** 2 - CENTER_Y ** 2);

/*
 * Sweep flag 0 — the run goes left exit, down through the bowl, up to the
 * right exit, which is decreasing angle in SVG's y-down space. The large-arc
 * flag is computed rather than written down: with the equator above the frame
 * the visible run is always less than a semicircle, but that stops being true
 * the moment someone drops `CENTER_Y` back below zero, and an arc drawn with
 * the wrong flag silently becomes its own complement.
 */
const SWEEP_DEGREES = 2 * (90 - (Math.atan2(-CENTER_Y, EXIT_DX) * 180) / Math.PI);
const LARGE_ARC = SWEEP_DEGREES > 180 ? 1 : 0;

const ARC_PATH = `M ${(CENTER_X - EXIT_DX).toFixed(2)} 0 A ${RADIUS} ${RADIUS} 0 ${LARGE_ARC} 0 ${(
  CENTER_X + EXIT_DX
).toFixed(2)} 0`;

/*
 * The bottom of the bowl: the point the light grows out of.
 *
 * Handed to GSAP as `svgOrigin`, not `transformOrigin`. `transformOrigin` in
 * px is measured from the element's own **bounding box**, and this group's box
 * starts well left of the viewBox because the widest halo stroke overhangs the
 * path by half its width. The result was an origin ~200 units right of the
 * circle's centre, so the arc grew out of a point off to the right and slid
 * into place — the one thing that gives away that it is a scaled object rather
 * than a light opening. `svgOrigin` is in the viewBox's own coordinates, which
 * is what these numbers have always meant.
 */
const ORIGIN = `${CENTER_X} ${CENTER_Y + RADIUS}`;

/*
 * Room below the bowl for the halo to fall off in.
 *
 * The viewBox used to end exactly on the arc's lowest point, which cut the
 * wide strokes off mid-falloff and drew a dead-straight horizontal line across
 * the bottom of the glow — the one shape a light source cannot have. Half the
 * widest stroke is enough for it to reach zero on its own.
 */
const BOTTOM_BLEED = 70;


/* Left/top/width/height, cropped to the drawing rather than to round numbers. */
const VIEW_HEIGHT = CENTER_Y + RADIUS + BOTTOM_BLEED;
const VIEW_BOX = `0 0 ${CENTER_X * 2} ${VIEW_HEIGHT}`;

/*
 * The bleed as a share of the SVG's own height, handed to CSS so it can put
 * the bowl back where it was.
 *
 * The element is anchored by its bottom edge, so growing the box downward
 * lifts the bowl by exactly this much; a `translateY` percentage resolves
 * against the element's own height, which is the one unit that cancels it out
 * at every width. Passing it as a variable rather than writing the percentage
 * into the stylesheet means the two cannot drift when the geometry is tuned.
 */
const ARC_BLEED = `${((BOTTOM_BLEED / VIEW_HEIGHT) * 100).toFixed(3)}%`;

/*
 * The bloom, as two Gaussian-blurred copies of the path.
 *
 * **This used to be five stacked strokes and it read as a cartoon.** The
 * argument for stacking was performance — a blur filter is an offscreen pass —
 * and it is a real cost, but it buys the one thing the effect cannot be
 * faithful without. Every stroke has an *edge*. Stack five and you get five
 * visible ribbons nested inside each other, which is what the render looked
 * like next to the reference: concentric mint bands where the reference has a
 * formless haze with no discernible boundary anywhere in it. No number of
 * additional strokes fixes that; it makes the bands thinner and keeps every
 * one of their edges.
 *
 * Three tiers, because that is what the reference's falloff actually has and
 * two could not fake it: a **hot** ring hugging the filament so the line looks
 * like it is burning rather than drawn, a **bloom** carrying the colour, and a
 * very wide, very faint atmospheric **haze**. Built with two layers the arc
 * came out as a pale thread with a distant fog around it and nothing in
 * between — technically a glow, visibly not a light.
 *
 * The hot ring is nearly white and the two outer tiers carry the colour. Run
 * with all three in saturated `--glow` the arc came out as a neon tube: an
 * even green line with green around it. Real light blows out to white at its
 * centre and only shows what colour it is on the way down, so saturation has
 * to *increase* outward from the filament rather than staying flat.
 *
 * `stdDeviation` is in viewBox units, so all of this scales with the drawing.
 */
const BLOOM_LAYERS = [
  /*
   * The arms carry a wide extra layer that is simply absent across the middle
   * of the bowl. Gradients alone could not do this: they vary a stroke's
   * *opacity* along its length, and what separates the reference's arms from
   * its bowl is mostly **thickness** — the top corners are a broad blown-out
   * band and the bottom is a thread. A second, much wider copy masked to the
   * ends by its own gradient is the cheap way to vary width along a path,
   * which SVG otherwise will not do.
   */
  { filter: 'hero-arc-bloom', gradient: 'hero-arc-arms', width: 46, opacity: 0.85 },
  { filter: 'hero-arc-bloom', gradient: 'hero-arc-halo', width: 26, opacity: 0.8 },
  { filter: 'hero-arc-hot', gradient: 'hero-arc-hot-grad', width: 7, opacity: 1 },
];

export function HeroArc() {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = root.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      /*
       * **Only the unfiltered half of the arc is allowed to move.**
       *
       * This is a performance constraint before it is a design one, and
       * ignoring it froze the page on every refresh. A Gaussian blur is
       * rasterised into a cache; changing the geometry underneath it — a
       * transform, or DrawSVG rewriting `stroke-dasharray` — throws that cache
       * away and re-blurs from scratch on every single frame. Three blurred
       * layers doing that at once, inside a blended stacking context, under
       * three backdrop-filtered pills, is not a slow animation. It is a stall.
       *
       * Opacity is the exception: it is applied when the cached layer is
       * composited, so a filtered element can fade for free. So the bloom
       * holds still and fades, and the bare filament does all the moving.
       *
       * The measurements said to do this anyway. The reference's geometry
       * settles at 0.34s while its brightness goes on climbing to 0.9s — two
       * clocks, which is exactly what splitting the group produces.
       */
      tl.fromTo(
        '[data-arc-shape]',
        { scaleX: 0.42, scaleY: 0.1, svgOrigin: ORIGIN },
        {
          scaleX: 1,
          scaleY: 1,
          duration: HERO.arcOpen.duration,
          ease: 'power1.out',
        },
        HERO.arcOpen.at,
      );

      tl.fromTo(
        '[data-arc-stroke]',
        { drawSVG: '46% 54%' },
        { drawSVG: '0% 100%', duration: HERO.arcOpen.duration },
        HERO.arcOpen.at,
      );

      /*
       * The light comes up, at final geometry, on its own slower clock. It
       * starts a beat after the filament so there is never a frame with a
       * full-size glow around a half-size line.
       */
      tl.fromTo(
        '[data-arc-bloom]',
        { opacity: 0 },
        {
          opacity: 1,
          duration: HERO.arcBloom.duration - HERO.arcBloom.at,
          ease: 'power2.out',
        },
        HERO.arcBloom.at,
      );

      /*
       * The heads. Each is a short window sliding to its own end of the path —
       * "46% 54%" is a short segment at the bottom of the bowl, which then
       * runs outward to the tip. Fading them on arrival is what makes them
       * read as travelling rather than as two more strokes on the arc.
       */
      tl.fromTo(
        '[data-arc-spark="right"]',
        { drawSVG: '50% 52%', opacity: 1 },
        { drawSVG: '96% 100%', duration: HERO.spark.duration, ease: 'power2.inOut' },
        HERO.spark.at,
      );
      tl.fromTo(
        '[data-arc-spark="left"]',
        { drawSVG: '48% 50%', opacity: 1 },
        { drawSVG: '0% 4%', duration: HERO.spark.duration, ease: 'power2.inOut' },
        HERO.spark.at,
      );
      tl.to(
        '[data-arc-spark]',
        { opacity: 0, duration: 0.45 },
        HERO.spark.at + HERO.spark.duration - 0.2,
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={root}
      viewBox={VIEW_BOX}
      className="hero-arc"
      style={{ '--arc-bleed': ARC_BLEED } as React.CSSProperties}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          The stroke burns out at both ends rather than stopping. A hard end on
          a line that is meant to be light is the single thing that gives the
          effect away.

          The core is `--glow-core`, which is very nearly white: the hot middle
          of a real light source is white and the *colour* lives in its
          falloff. A stroke saturated all the way through reads as a green
          line, not as something burning.

          The gradient holds full opacity across nearly the whole span and
          collapses to zero inside the last few percent. Both extremes were
          wrong. Fading gently from the middle put the dimmest part of the arc
          where the arms leave the frame, so they dissolved a third of the way
          up. Holding them lit right to the tip instead left the stroke at full
          brightness where the SVG's own box ends, which drew a hard horizontal
          cut across both arms — the element's edge, made visible by the very
          light that was supposed to be running past it. A short, sharp fade is
          the only version with neither failure: bright all the way up, gone
          before the boundary.
        */}
        <linearGradient id="hero-arc-core" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--glow-core)" stopOpacity="0" />
          <stop offset="6%" stopColor="var(--glow-core)" stopOpacity="1" />
          <stop offset="26%" stopColor="var(--glow-core)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="var(--glow-core)" stopOpacity="0.38" />
          <stop offset="74%" stopColor="var(--glow-core)" stopOpacity="0.8" />
          <stop offset="94%" stopColor="var(--glow-core)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--glow-core)" stopOpacity="0" />
        </linearGradient>

        {/* The same falloff for the halo, which never reaches full white. */}
        <linearGradient id="hero-arc-halo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0" />
          <stop offset="7%" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="28%" stopColor="var(--glow)" stopOpacity="0.82" />
          <stop offset="50%" stopColor="var(--glow)" stopOpacity="0.45" />
          <stop offset="72%" stopColor="var(--glow)" stopOpacity="0.82" />
          <stop offset="93%" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </linearGradient>

        {/*
          The arm layer: full strength at both ends, nothing at all across the
          middle two-fifths, so it thickens the arms without touching the bowl.
        */}
        <linearGradient id="hero-arc-arms" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0" />
          <stop offset="7%" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="18%" stopColor="var(--glow)" stopOpacity="0.62" />
          <stop offset="34%" stopColor="var(--glow)" stopOpacity="0" />
          <stop offset="66%" stopColor="var(--glow)" stopOpacity="0" />
          <stop offset="82%" stopColor="var(--glow)" stopOpacity="0.62" />
          <stop offset="93%" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </linearGradient>

        {/*
          The hot ring's colour is `--glow-core`, which is very nearly white,
          so the few units either side of the filament blow out instead of
          reading as more green.
        */}
        <linearGradient id="hero-arc-hot-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--glow-core)" stopOpacity="0" />
          <stop offset="8%" stopColor="var(--glow-core)" stopOpacity="1" />
          <stop offset="30%" stopColor="var(--glow-core)" stopOpacity="0.7" />
          <stop offset="50%" stopColor="var(--glow-core)" stopOpacity="0.22" />
          <stop offset="70%" stopColor="var(--glow-core)" stopOpacity="0.7" />
          <stop offset="92%" stopColor="var(--glow-core)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--glow-core)" stopOpacity="0" />
        </linearGradient>

        {/*
          The three blurs.

          Each region is sized to what its own blur actually reaches — three
          standard deviations plus half the stroke — and not one percent
          further. The region is the area the browser rasterises, so a filter
          given twice the room it needs costs roughly twice as much on every
          frame of the entrance for a result that is identical.

          The old default was to be generous. A filter defaults to a
          box only 10% larger than the element, and a Gaussian reaches roughly
          three standard deviations — so the haze needs well over a hundred
          units of room on every side or the browser clips it and hands back
          the hard rectangular edge the blur existed to avoid.

          The haze is the expensive one and its cost is quadratic in the region
          it covers: at `stdDeviation="64"` over a 190% box it was blurring
          roughly six megapixels on every frame of a 1.15s scale animation. A
          wider stroke blurred less far reaches almost the same falloff for
          about half the work, which is the trade taken here.
        */}
        <filter
          id="hero-arc-bloom"
          x="-8%"
          y="-13%"
          width="116%"
          height="126%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="14" />
        </filter>

        <filter
          id="hero-arc-hot"
          x="-2%"
          y="-4%"
          width="104%"
          height="108%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="4.5" />
        </filter>

        {/*
          **The light is densest at the arms, not at the bottom of the bowl.**
          Every gradient here peaks near 0% and 100% — the two ends, which are
          the arms running off the top of the frame — and falls to its dimmest
          at 50%, the bottom centre. That is the reference's distribution, and
          it is the exact opposite of what these gradients used to do. Sampling
          it makes the difference unmistakable: the top corners are thick,
          blown-out white and the bottom of the bowl is a thin blue thread.

          It reads correctly too, once seen. The bowl is the part nearest the
          viewer and the arms are running away off-screen; light that gets
          brighter towards the horizon is what makes the curve feel enormous
          rather than like a smile drawn under a word.
        */}
        <linearGradient id="hero-arc-filament" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="9%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="91%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g data-arc-bloom>
        {/*
          Keyed on the gradient, not the filter. Two layers deliberately share
          `hero-arc-bloom` — the arms and the main halo are the same blur at
          different widths — so the filter stopped being unique the moment the
          arm layer was added, and React read the duplicate key as two renders
          of one child.
        */}
        {BLOOM_LAYERS.map((layer) => (
          <g key={layer.gradient} filter={`url(#${layer.filter})`}>
            <path
              d={ARC_PATH}
              fill="none"
              stroke={`url(#${layer.gradient})`}
              strokeWidth={layer.width}
              strokeOpacity={layer.opacity}
            />
          </g>
        ))}
      </g>

      <g data-arc-shape>

        {/*
          The filament: the light itself, and it is thin.

          The reference's arc is a *hairline* — the width in the render is
          almost entirely bloom, with a razor-thin blown-out line at its
          centre. Ours was a 9-unit mint stroke with a 3-unit white one on top,
          which at this scale is a painted ribbon rather than a filament, and
          no amount of glow around a ribbon reads as light.

          Colour lives in the bloom and the centre is blown out, because that
          is what a light source does: the hot middle of one is white whatever
          colour it is, and a stroke saturated all the way through reads as a
          green line.
        */}
        <path
          data-arc-stroke
          d={ARC_PATH}
          fill="none"
          stroke="url(#hero-arc-core)"
          strokeWidth="3.5"
        />

        <path
          data-arc-stroke
          d={ARC_PATH}
          fill="none"
          stroke="url(#hero-arc-filament)"
          strokeWidth="1.6"
        />

        {/*
          The heads default to zero-length and transparent: they are pure
          entrance, and a reader who never gets the bundle should see a settled
          arc, not two stray dashes sitting on it.
        */}
        <path
          data-arc-spark="left"
          d={ARC_PATH}
          fill="none"
          stroke="var(--glow-core)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0"
        />
        <path
          data-arc-spark="right"
          d={ARC_PATH}
          fill="none"
          stroke="var(--glow-core)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0"
        />
      </g>
    </svg>
  );
}
