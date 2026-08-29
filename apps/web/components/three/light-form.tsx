'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

import { useNearViewport } from './use-near-viewport';
import { noopSubscribe, serverSnapshot, webglSupported } from './webgl-supported';

/**
 * The kinds of light-form the marketing surface has.
 *
 * One name per section, because each section is built around exactly one of
 * them — an orb with a comet, an eclipse, a globe of points, and a carousel of
 * the work itself. Adding a fifth means adding a section, not a variant.
 */
export type FormKind = 'orb' | 'eclipse' | 'globe' | 'showcase';

/**
 * Which ground the form is sitting on.
 *
 * It picks the light rig, and the two are opposites rather than adjustments.
 * On white the key comes from *behind* into a silhouette with a burning limb,
 * because a form lit from the front on a white page is a grey smudge. On the
 * near-black bands that same rig renders a black object on a black ground: the
 * silhouette has nothing to be a silhouette against. There the form has to be
 * lit like an object — a front key, a rim behind it, and the halo doing real
 * work. Judge a form on the ground it will actually sit on.
 */
export type FormGround = 'light' | 'dark';

/**
 * Loads the WebGL scene, and decides whether to load it at all.
 *
 * `ssr: false` is not optional: three.js touches `window` and `document` at
 * module scope, and rendering a `<Canvas>` on the server throws. Keeping the
 * import dynamic also keeps three (~600 kB) out of the initial bundle — it
 * arrives after the page is interactive, and every section that holds a form
 * paints its own bloom in CSS underneath, so the section reads as finished
 * whether the scene arrives, arrives late, or never arrives at all.
 */
const LightFormScene = dynamic(() => import('./light-form-scene'), { ssr: false });

export function LightForm({
  kind,
  ground = 'light',
  className = 'absolute inset-0',
}: {
  kind: FormKind;
  ground?: FormGround;
  /**
   * The box the scene fills, and therefore where the form appears. Sections
   * whose form belongs somewhere other than dead centre pass their own — the
   * camera looks at the middle of *this* box, so moving the box is how a form
   * is placed, rather than offsetting the group inside a scene that has no idea
   * how tall the section is.
   */
  className?: string;
}) {
  /*
   * `useSyncExternalStore` rather than `useState` + `useEffect`: this is a
   * client-only capability, which is exactly what the hook is for, and it
   * avoids the cascading render that calling setState from an effect causes.
   */
  const enabled = useSyncExternalStore(noopSubscribe, webglSupported, serverSnapshot);

  /*
   * **The scene waits until the reader is coming.**
   *
   * `ssr: false` keeps three out of the initial bundle but says nothing about
   * *when* it is evaluated, and the answer was "as soon as hydration finishes,
   * all three at once". Measured on the home page that is one 454ms task at
   * 1.75s — three GL contexts and their shaders — landing 586ms into the hero's
   * entrance and freezing the only animation on the page. Every one of those
   * three sections is below the fold on first paint, so none of that work was
   * for anything the reader could see.
   *
   * The observed element is the same absolutely-positioned box the scene would
   * have filled, so the measurement is of the section itself.
   */
  const { ref, near } = useNearViewport<HTMLDivElement>();

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className={`pointer-events-none -z-10 ${className}`}
      aria-hidden="true"
    >
      {near ? <LightFormScene kind={kind} ground={ground} /> : null}
    </div>
  );
}
