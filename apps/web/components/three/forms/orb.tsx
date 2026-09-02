'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import { FORM_COLORS } from './palette';

/**
 * The orb, with a comet crossing it — the reference's "Data Protection" frame.
 *
 * The sphere is deliberately dark and only lightly rough. Against a near-white
 * page it reads as a body the light is falling *around* rather than a green
 * ball, and the rim the key light carves out is the whole effect. Turning up
 * the material's own brightness to make it "greener" flattens it back into a
 * circle every time.
 */
export function Orb() {
  const comet = useRef<Group>(null);
  const still = useRef(prefersReducedMotion());
  const t = useRef(0);

  useFrame((_, delta) => {
    if (still.current || !comet.current) return;

    /*
     * The comet loops on a fixed period rather than easing between waypoints:
     * a reader can be on this section for a second or a minute, and a one-shot
     * flight is a thing that has already happened for almost all of them.
     */
    t.current = (t.current + delta * 0.09) % 1;

    const angle = t.current * Math.PI * 2;

    comet.current.position.set(
      Math.cos(angle) * 4.6,
      Math.sin(angle) * 1.9 + 0.4,
      2.4,
    );
    comet.current.rotation.z = angle + Math.PI / 2;
  });

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2.75, 64, 64]} />
        <meshStandardMaterial
          color={FORM_COLORS.deep}
          roughness={0.42}
          metalness={0.1}
          /*
           * A trace of self-illumination so the unlit side is a deep green
           * rather than a hole in the page. On a white ground a pure black
           * terminator reads as a printing error.
           */
          emissive={FORM_COLORS.ink}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/*
        The halo: a slightly larger sphere rendered from the inside, additively
        blended. This is the cheap stand-in for a bloom pass — a real one costs
        two full-screen renders per frame, and this is a decoration behind a
        paragraph.
      */}
      <mesh scale={1.14}>
        <sphereGeometry args={[2.75, 32, 32]} />
        <meshBasicMaterial
          color={FORM_COLORS.glow}
          transparent
          opacity={0.16}
          side={1 /* THREE.BackSide */}
          depthWrite={false}
        />
      </mesh>

      <group ref={comet} position={[4.6, 0.4, 2.4]}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={FORM_COLORS.core} />
        </mesh>

        {/*
          The tail is a cone pointing back along the flight path, faded out at
          its base. Rotated -90° about Z because a cone's axis is +Y and the
          comet travels along +X.
        */}
        <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.07, 1.8, 12, 1, true]} />
          <meshBasicMaterial
            color={FORM_COLORS.core}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
