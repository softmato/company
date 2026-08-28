'use client';

import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

import { ARC_BLEED, LENS_ARC, LENS_FILL, LENS_ORIGIN, VIEW_BOX } from './hero-geometry';
import { heroStart } from './hero-start';
import { HERO } from './hero-timing';

/**
 * The light rising at the centre of the hero: a dome of colour standing behind
 * the bowl, with one bright crescent travelling along its rim.
 *
 * **This was built wrong once, and the wrong version is worth naming.** Read
 * quickly, the reference looks like a small curve crossing the big one to make
 * a pointed almond, lit at both tips. Everything about that is wrong except the
 * outline. What is actually there is a *body* — a filled dome of blue standing
 * on the arc like a planet on a horizon, its interior clearly brighter than the
 * ground around it — and a single hot crescent on its upper right, tapering to
 * nothing at both ends and blown out to white where it is thickest. Built as
 * two crossing hairlines with a symmetric flare at each crossing it reads as a
 * diagram of the reference rather than the reference: pointed where that is
 * round, empty where that is full, and symmetric where the entire character of
 * the thing is that the light comes from one side.
 *
 * The dome is the same cap either reading produces, so the geometry in
 * `hero-geometry.ts` survived. What changed is that the fill carries the effect
 * and the rim is an edge on a solid, not a pair of lines meeting at a point.
 *
 * **Two SVGs, straddling the wordmark.** The dome sits behind the letters,
 * because a body of colour drawn over white glyphs with normal compositing can
 * only dim them, and in the reference the middle letters stay white with the
 * colour welling up behind. The crescent sits in front, because that is the one
 * thing in the reference that visibly washes across the letters it passes.
 *
 * The blurred half only ever changes opacity and the unfiltered half does all
 * the moving — the split `hero-arc.tsx` documents at length. It matters more
 * here because the crescent never stops: its glow is built from wide, soft
 * *strokes* rather than a Gaussian blur, so a shape that moves every frame
 * never invalidates a filter cache.
 */

/*
 * The rim highlight, as unfiltered strokes travelling together.
 *
 * A blur would be the obvious way to make a stroke glow and it is the one thing
 * this element cannot afford — it moves continuously, and a filter is
 * re-rasterised on every frame its geometry changes. Round-capped strokes at
 * varying widths give the same falloff for the cost of ordinary paths, and the
 * widest one is what washes over the letters the crescent passes.
 *
 * **The widest layer is the shortest, and getting that backwards is what made
 * the first version look like a smear.** A crescent tapers: no thickness at
 * the tips, most of it in the middle. Stack strokes whose width and length
 * both grow together and every layer ends at roughly the same place, so they
 * pile into a blunt lozenge with round ends — which is exactly how it read
 * against the reference, a green slab lying across the middle letters. Order
 * them the other way and the long thin ones draw the tips while the short fat
 * one fills the belly, and the silhouette comes out as a sliver.
 *
 * `spread` is each window's half-length along the rim, in percent; `width` is
 * its stroke. They share a centre, so the taper stays symmetric as it travels.
 */
const CRESCENT_LAYERS = [
  { key: 'halo', width: 30, spread: 9, opacity: 0.14, stroke: 'var(--glow)' },
  { key: 'tip', width: 2.4, spread: 17, opacity: 0.45, stroke: 'var(--glow)' },
  { key: 'mid', width: 6, spread: 11.5, opacity: 0.6, stroke: 'var(--glow-core)' },
  { key: 'belly', width: 11, spread: 6.5, opacity: 0.85, stroke: 'var(--glow-core)' },
  { key: 'core', width: 3.2, spread: 3.5, opacity: 1, stroke: '#ffffff' },
];

/*
 * Where the highlight sweeps between, as centre positions along the rim. It
 * never reaches either end: a crescent that runs off the tip of the dome has
 * to be faded out and back, and the reference's never leaves the lit face.
 */
const SWEEP_FROM = 30;
const SWEEP_TO = 76;

const windowAt = (centre: number, spread: number) =>
  `${(centre - spread).toFixed(1)}% ${(centre + spread).toFixed(1)}%`;

/** What the dome rests at between breaths. */
const BLOOM_REST = 0.72;

export function HeroEye() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, paused: true });

      /*
       * The dome grows out of the bottom of the bowl rather than fading in
       * where it will end up. Scaled on the unfiltered group only, about the
       * chord, so the base stays welded to the arc while the top rises.
       */
      tl.fromTo(
        '[data-eye-shape]',
        { scaleY: 0.15, svgOrigin: LENS_ORIGIN },
        { scaleY: 1, duration: HERO.eye.open.duration, ease: 'power3.out' },
        HERO.eye.open.at,
      );

      tl.fromTo(
        '[data-eye-bloom]',
        { opacity: 0 },
        { opacity: 1, duration: HERO.eye.bloom.duration },
        HERO.eye.bloom.at,
      );

      /*
       * The crescent arrives already in motion — it fades up partway along its
       * first sweep rather than switching on at one end. Light that begins
       * travelling at the instant it becomes visible reads as a sprite being
       * enabled.
       */
      tl.fromTo(
        '[data-eye-crescent]',
        { opacity: 0 },
        { opacity: 1, duration: HERO.eye.flare.duration },
        HERO.eye.flare.at,
      );

      /* ---- the idle ---- */

      /*
       * The highlight sweeps the rim and back, forever.
       *
       * Not a wrapping loop: the rim is an open arc, so a window running off
       * one end and reappearing at the other pops. A slow yoyo has no seam, and
       * it is what the reference actually shows over its settled seconds — the
       * hot spot sits left, crosses to the right, and climbs the far side,
       * rather than racing round and round.
       *
       * Each layer gets its own tween because each has its own window width;
       * they share duration and easing, so they stay concentric by
       * construction.
       */
      for (const layer of CRESCENT_LAYERS) {
        tl.fromTo(
          `[data-crescent="${layer.key}"]`,
          { drawSVG: windowAt(SWEEP_FROM, layer.spread) },
          {
            drawSVG: windowAt(SWEEP_TO, layer.spread),
            duration: 5.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
          HERO.eye.idle - 2.2,
        );
      }

      /*
       * Two breaths on mismatched periods so they never lock into one throb.
       * Opacity on the blurred half, a flex on the bare half.
       */
      tl.to(
        '[data-eye-bloom]',
        { opacity: BLOOM_REST, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' },
        HERO.eye.idle,
      );

      tl.to(
        '[data-eye-shape]',
        {
          scaleY: 1.04,
          svgOrigin: LENS_ORIGIN,
          duration: 1.9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        },
        HERO.eye.idle,
      );

      void heroStart().then(() => tl.play());

      /*
       * **The idle stops when the hero does.**
       *
       * This timeline never completes, so left alone it drives GSAP's ticker
       * for the whole visit — every frame of every scroll, for an animation
       * three sections above the reader. That is the sort of permanent cost
       * that makes a page feel heavy everywhere except where the work is
       * actually going.
       */
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) tl.play();
          else tl.pause();
        },
        { rootMargin: '10% 0px' },
      );

      io.observe(el);
      /* `gsap.context` cleans the tweens; the observer is ours to undo. */
      return () => io.disconnect();
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} aria-hidden="true">
      <svg
        viewBox={VIEW_BOX}
        className="hero-eye"
        data-eye-layer="bloom"
        style={{ '--arc-bleed': ARC_BLEED } as React.CSSProperties}
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
      >
        <defs>
          {/*
            The dome's body.

            Brightest along its own upper edge rather than at its centre, which
            is what makes it read as a lit surface instead of a coloured
            blob — and the centre is offset toward the side the crescent
            lives on, so the whole form agrees about where the light is
            coming from. A radial gradient that reaches zero needs no blur to
            lose its edge, which matters for a shape that is composited for as
            long as the hero is on screen.
          */}
          <radialGradient
            id="hero-eye-body"
            cx="0.58"
            cy="0.86"
            r="0.78"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.9" />
            <stop offset="34%" stopColor="var(--glow)" stopOpacity="0.62" />
            <stop offset="68%" stopColor="var(--glow-deep)" stopOpacity="0.52" />
            <stop offset="100%" stopColor="var(--glow-deep)" stopOpacity="0.08" />
          </radialGradient>

          {/* The rim's soft halo, weighted to the lit side. */}
          <linearGradient id="hero-eye-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.5" />
            <stop offset="45%" stopColor="var(--glow)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--glow-core)" stopOpacity="1" />
          </linearGradient>

          <filter
            id="hero-eye-bloom"
            x="-10%"
            y="-42%"
            width="120%"
            height="184%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g data-eye-bloom opacity={BLOOM_REST}>
          <g data-eye-shape>
            <path d={LENS_FILL} fill="url(#hero-eye-body)" stroke="none" />
          </g>

          <g filter="url(#hero-eye-bloom)">
            <path
              d={LENS_ARC}
              fill="none"
              stroke="url(#hero-eye-rim)"
              strokeWidth="13"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      <svg
        viewBox={VIEW_BOX}
        className="hero-eye"
        data-eye-layer="core"
        style={{ '--arc-bleed': ARC_BLEED } as React.CSSProperties}
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
      >
        <defs>
          {/*
            The rim itself: a thread, and dim. It is the edge of the dome, not
            a drawn curve — all the brightness on this element belongs to the
            crescent travelling along it.
          */}
          <linearGradient id="hero-eye-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--glow-core)" stopOpacity="0.28" />
            <stop offset="50%" stopColor="var(--glow-core)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--glow-core)" stopOpacity="0.72" />
          </linearGradient>
        </defs>

        <path d={LENS_ARC} fill="none" stroke="url(#hero-eye-edge)" strokeWidth="2" />

        {/*
          The crescent. Three round-capped windows sharing a centre: a wide
          soft wash that carries over the letters, a body, and a hot core that
          is very nearly white. Zero opacity by default — it is pure motion, and
          a reader who never gets the bundle should see a settled dome rather
          than a bright dash parked on its rim.
        */}
        <g data-eye-crescent opacity="0">
          {CRESCENT_LAYERS.map((layer) => (
            <path
              key={layer.key}
              data-crescent={layer.key}
              d={LENS_ARC}
              fill="none"
              stroke={layer.stroke}
              strokeWidth={layer.width}
              strokeOpacity={layer.opacity}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
