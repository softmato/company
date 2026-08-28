'use client';

import { Canvas } from '@react-three/fiber';

import { useInView } from './use-in-view';

import { Eclipse } from './forms/eclipse';
import { FORM_COLORS } from './forms/palette';
import { Orb } from './forms/orb';
import { PointGlobe } from './forms/point-globe';
import type { FormKind } from './light-form';

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
export default function LightFormScene({ kind }: { kind: FormKind }) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    >
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
          Low fill, one hard key from behind. See the note above: this ratio is
          what separates a lit object from a silhouette, and the silhouette is
          the one that reads on white.
        */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[-6, 3, -5]}
          intensity={2.6}
          color={FORM_COLORS.core}
        />
        <directionalLight position={[4, -3, 6]} intensity={0.5} color="#ffffff" />

        {kind === 'orb' ? <Orb /> : null}
        {kind === 'eclipse' ? <Eclipse /> : null}
        {kind === 'globe' ? <PointGlobe /> : null}
      </Canvas>
    </div>
  );
}
