'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * A slow, permanent rotation for a light-form, and the ref to attach it to.
 *
 * Read once rather than subscribed to: `useFrame` runs sixty times a second
 * and a `matchMedia` lookup per frame is sixty lookups per second for an
 * answer that changes roughly never. A reader who flips the OS setting mid-page
 * gets the change on their next navigation, which is the right trade.
 *
 * Under reduced motion the form still renders — it is the section's imagery,
 * not an animation — it simply holds still.
 */
export function useIdleSpin(radiansPerSecond = 0.06) {
  const ref = useRef<Group>(null);
  const still = useRef(prefersReducedMotion());

  useFrame((_, delta) => {
    if (still.current || !ref.current) return;

    ref.current.rotation.y += radiansPerSecond * delta;
  });

  return ref;
}
