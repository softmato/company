'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

import { noopSubscribe, serverSnapshot, webglSupported } from './webgl-supported';

/**
 * The kinds of light-form the marketing surface has.
 *
 * One name per section, because each section is built around exactly one of
 * them — see the reference film: an orb with a comet, an eclipse, a globe of
 * points. Adding a fourth means adding a section, not a variant.
 */
export type FormKind = 'orb' | 'eclipse' | 'globe';

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

export function LightForm({ kind }: { kind: FormKind }) {
  /*
   * `useSyncExternalStore` rather than `useState` + `useEffect`: this is a
   * client-only capability, which is exactly what the hook is for, and it
   * avoids the cascading render that calling setState from an effect causes.
   */
  const enabled = useSyncExternalStore(noopSubscribe, webglSupported, serverSnapshot);

  if (!enabled) return null;

  return <LightFormScene kind={kind} />;
}
