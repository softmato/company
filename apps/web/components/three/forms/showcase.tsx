'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Group,
  LinearFilter,
  SRGBColorSpace,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import { FORM_COLORS } from './palette';
import { SURFACES } from './surfaces';

/**
 * The work, turning. The closing section's form.
 *
 * Four surfaces — a website, an app, a product, an artboard — orbiting a common
 * axis, each turning to the front in turn and never stopping. It is the last
 * thing on the page, under the question *"have something that needs building
 * properly?"*, and it is the answer to that question stated as a picture: this
 * is what we make.
 *
 * **Why surfaces and not an abstract form.** Every other section on this page
 * carries a light-form that is a *metaphor* — an orb, a globe of points. The
 * first draft of this one was too: a cube assembling itself out of blocks. It
 * was handsome and it said nothing a reader could name. At the foot of a
 * marketing page, one screen above a contact button, the most persuasive object
 * available is the work itself, and the four things this company sells are
 * things with a shape. A browser window, a phone, a dashboard and an artboard
 * are recognised before they are read.
 *
 * **Each panel is one plane with a canvas texture, not forty meshes.** The
 * drawings are 2D canvas, painted once at mount (`./surfaces/`), so a panel
 * costs one draw call and stays crisp at the front of the carousel instead of
 * depth-fighting its own contents. Four panels, four draw calls, and nothing in
 * the frame loop but a matrix and an opacity per panel.
 *
 * **The panels billboard.** The group turns; each panel counter-turns by the
 * same amount, so it orbits without ever going edge-on. A carousel of flat
 * panels that genuinely rotate spends half its cycle showing the reader four
 * vertical lines, which is a screensaver rather than a portfolio.
 *
 * Under reduced motion it holds at the first surface and never moves. The form
 * is the section's imagery, not an animation — same rule as `useIdleSpin`.
 */

/**
 * Radius of the carousel, in world units.
 *
 * Sized against the panel rather than picked. Two things it has to satisfy:
 * the panels billboard, so the front one sits at x = 0 and the side ones at
 * ±RADIUS and the radius has to keep them from passing through each other; and
 * the front panel is RADIUS units *closer to the camera* than the group's
 * centre, so it is magnified by `9 / (9 − RADIUS)`. At 4.8 that was 2.1× and
 * the front panel filled the whole band and ran over the copy above it — the
 * first version's mistake was tuning the panel's size in isolation and
 * forgetting that the carousel is what moves it toward the lens.
 *
 * **The size is bounded by the arc, not by the band.** The carousel sits inside
 * the bowl the closing arc draws and has to stay inside it — an object that
 * fills the whole band stops being a flourish and starts competing with the
 * button it is meant to be framing. Big enough to recognise a browser window, a
 * phone and an artboard at a glance, and no wider than the arc's legs.
 *
 * Raising the height alone does not work: at a fixed radius a taller panel just
 * swallows the two beside it, because the side panels sit at ±RADIUS with no
 * magnification while the front one is magnified by `m`. The two move together —
 * the side panels clear the front one only while `RADIUS > H·aspect·(0.68 + m)/2`
 * — so scale both, then look at it.
 */
const RADIUS = 3.2;
/** Height of the largest panel, in world units. Widths follow each aspect. */
const PANEL_HEIGHT = 2.5;
/** Radians per second. One full cycle is about 35 seconds. */
const SPEED = 0.18;

/**
 * How wide the carousel is at its widest, in world units — the front panel's
 * half-width plus the reach of the side panels, doubled.
 *
 * The camera's field of view is *vertical*, so the world height a canvas shows
 * is the same whatever its shape and the world *width* shrinks with the box. On
 * a phone that box is a third the width it is on a desktop and the carousel runs
 * off both sides of it. Scaling the whole group to fit is one multiply and it
 * keeps the composition identical at every width, which is what a fixed size and
 * a media query cannot do.
 */
const SPAN = 2 * (RADIUS + (PANEL_HEIGHT * 1.62) / 2);

export function Showcase() {
  const viewport = useThree((state) => state.viewport);
  const group = useRef<Group>(null);
  const panels = useRef<(Group | null)[]>([]);
  const still = useRef(prefersReducedMotion());
  const spin = useRef(0);

  /*
   * The textures, painted once. `document.createElement` is safe here — the
   * whole WebGL layer is imported with `ssr: false`, so nothing in this file
   * ever runs on the server.
   */
  const textures = useMemo(
    () =>
      SURFACES.map((surface) => {
        const canvas = document.createElement('canvas');
        canvas.width = surface.width;
        canvas.height = surface.height;

        const ctx = canvas.getContext('2d');
        if (ctx) surface.draw(ctx, surface.width, surface.height);

        const texture = new CanvasTexture(canvas);
        /*
         * sRGB, or every colour in the drawing comes out washed: three treats
         * an unflagged texture as linear data and the panels arrive noticeably
         * paler than the CSS bloom behind them.
         */
        texture.colorSpace = SRGBColorSpace;
        /* No mipmaps: the panels are never far enough away to need them, and
           generating them for four megapixel canvases costs more than it saves. */
        texture.generateMipmaps = false;
        texture.minFilter = LinearFilter;

        return texture;
      }),
    [],
  );

  /* Textures hold GPU memory until they are told not to. */
  useEffect(
    () => () => textures.forEach((texture) => texture.dispose()),
    [textures],
  );

  useFrame((_, delta) => {
    if (!still.current) spin.current += delta * SPEED;

    if (group.current) group.current.rotation.y = spin.current;

    panels.current.forEach((panel, index) => {
      if (!panel) return;

      /* Counter-rotate so the panel faces the camera at every point of the orbit. */
      panel.rotation.y = -spin.current;

      /*
       * How far forward this panel currently is, 0 at the back and 1 at the
       * front. Everything else — scale, opacity, lift — is a function of it, so
       * the panel coming forward brightens and grows as one gesture rather than
       * three that have to be kept in step.
       */
      const angle = spin.current + (index / SURFACES.length) * Math.PI * 2;
      const front = (Math.cos(angle) + 1) / 2;

      panel.scale.setScalar(0.68 + 0.32 * front);
      panel.position.y = -0.2 + front * 0.2;

      /*
       * Child 0 is the halo, child 1 is the drawing, and they fade on different
       * curves. Fading them together turns a receding panel into a green ghost:
       * the drawing goes translucent while the halo behind it does not, so what
       * is left is the halo. The halo has to fade *faster* than the thing it is
       * meant to be lighting.
       */
      const halo = panel.children[0] as Mesh | undefined;
      const face = panel.children[1] as Mesh | undefined;

      const haloMaterial = halo?.material as MeshBasicMaterial | undefined;
      const faceMaterial = face?.material as MeshBasicMaterial | undefined;

      if (haloMaterial) haloMaterial.opacity = 0.04 + 0.13 * front ** 2.2;
      if (faceMaterial) faceMaterial.opacity = 0.28 + 0.72 * front ** 1.5;
    });
  });

  return (
    <group
      ref={group}
      rotation={[0.06, 0, 0]}
      scale={Math.min(1, viewport.width / (SPAN * 1.2))}
    >
      {SURFACES.map((surface, index) => {
        const angle = (index / SURFACES.length) * Math.PI * 2;
        const height = PANEL_HEIGHT;
        const width = height * (surface.width / surface.height);

        return (
          <group
            key={surface.id}
            ref={(node) => {
              panels.current[index] = node;
            }}
            position={[Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS]}
          >
            {/*
              The halo behind the panel: a slightly larger plane in the brand
              green, additively soft. It is what stops a dark drawing on a dark
              band reading as a hole, and it is cheaper than a bloom pass by two
              full-screen renders a frame.
            */}
            <mesh position={[0, 0, -0.02]} scale={1.05}>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial
                color={FORM_COLORS.glow}
                transparent
                opacity={0.14}
                depthWrite={false}
              />
            </mesh>

            <mesh>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial
                map={textures[index] ?? null}
                transparent
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
