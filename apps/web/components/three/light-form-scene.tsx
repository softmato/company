'use client';

import { Canvas } from '@react-three/fiber';

import { useInView } from './use-in-view';

import { Eclipse } from './forms/eclipse';
import { FORM_COLORS } from './forms/palette';
import { Orb } from './forms/orb';
import { PointGlobe } from './forms/point-globe';
import { Showcase } from './forms/showcase';
import type { FormGround, FormKind } from './light-form';

/**
 * The WebGL layer behind a marketing section.
 *
 * Sits in an absolutely-positioned, `pointer-events-none` canvas underneath
 * the copy — it is decoration, and it must never intercept a click meant for a
 * link or eat a scroll gesture. It carries `aria-hidden` for the same reason:
 * there is nothing here to announce.
 *
 * `alpha: true` and a transparent clear colour, because the section's ground
 * and its CSS bloom are painted underneath and have to show through. The forms
 * are lit to read against a near-white page, not a black one — which is the
 * inversion this whole design makes against the reference, and it is why the
 * key light comes from behind the form rather than in front of it. A form lit
 * from the front on a white page is a grey smudge; lit from behind it is a
 * silhouette with a burning limb, which is the picture we are after.
 *
 * `frameloop` follows visibility. The canvas stays mounted either way — tearing
 * down a WebGL context and building it again on every scroll past is both
 * slower and visible — but an off-screen scene stops drawing entirely, which is
 * what keeps three of these on one page from spending three scenes' worth of
 * frame budget to draw the one the reader is looking at.
 */
export default function LightFormScene({
  kind,
  ground = 'light',
}: {
  kind: FormKind;
  ground?: FormGround;
}) {
  const dark = ground === 'dark';

  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    /*
      `LightForm` owns the positioned box now — it has to exist before this
      component does, so there is something to observe while deciding whether to
      mount it. This one is only here to carry the visibility ref.
    */
    <div ref={ref} className="absolute inset-0">
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        /*
         * Capped at 1.6 rather than the device's own ratio. A 3x phone screen
         * renders nine times the pixels for shapes that are deliberately soft,
         * and it is the fastest way to make a decorative canvas cost more than
         * the rest of the page put together.
         */
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        {/*
          Two rigs, and they are opposites rather than one adjusted.

          On white: low fill and one hard key from *behind*, which is what
          separates a lit object from a silhouette — and the silhouette is the
          one that reads on a near-white page.

          On the near-black bands that rig produces a black object on a black
          ground, because the silhouette has nothing to be a silhouette against.
          There the form is lit like an object: a real front key, a cooler rim
          behind it to pick the edge off the ground, and more ambient so the
          unlit faces are a deep green rather than a hole.
        */}
        <ambientLight intensity={dark ? 0.85 : 0.35} />
        <directionalLight
          position={dark ? [-5, 4, 6] : [-6, 3, -5]}
          intensity={dark ? 2.2 : 2.6}
          color={FORM_COLORS.core}
        />
        <directionalLight
          position={dark ? [5, -2, -6] : [4, -3, 6]}
          intensity={dark ? 1.4 : 0.5}
          color={dark ? FORM_COLORS.glow : '#ffffff'}
        />

        {kind === 'orb' ? <Orb /> : null}
        {kind === 'eclipse' ? <Eclipse /> : null}
        {kind === 'globe' ? <PointGlobe /> : null}
        {kind === 'showcase' ? <Showcase /> : null}
      </Canvas>
    </div>
  );
}
