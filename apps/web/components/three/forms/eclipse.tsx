'use client';

import { FORM_COLORS } from './palette';
import { useIdleSpin } from './use-idle-spin';

/**
 * The eclipse — the reference's "Completely anonymous" frame: a dark ellipse
 * with one burning crescent down its edge.
 *
 * Built as three layers rather than lit into existence:
 *
 *   1. a wide, faint disc for the light spilling past the body,
 *   2. an emissive ring at the body's radius, which is the crescent, and
 *   3. an ink sphere on top, offset a little toward the camera and to the
 *      right, which occludes all of the ring except the sliver on its left.
 *
 * Doing it with lights instead needs a bloom pass to look like anything, and
 * a bloom pass is two extra full-screen renders per frame for a shape sitting
 * behind a heading. The occluder gets the same picture for three meshes.
 */
export function Eclipse() {
  const group = useIdleSpin(0.03);

  return (
    <group ref={group} rotation={[0.18, 0, -0.32]}>
      {/* 1. The spill. */}
      <mesh position={[-0.35, 0, -0.6]}>
        <circleGeometry args={[4.6, 64]} />
        <meshBasicMaterial
          color={FORM_COLORS.glow}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* 2. The crescent. */}
      <mesh position={[-0.28, 0.04, -0.2]}>
        <ringGeometry args={[2.42, 2.62, 96]} />
        <meshBasicMaterial
          color={FORM_COLORS.core}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>

      {/* 3. The body. */}
      <mesh position={[0, 0, 0.3]}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshStandardMaterial
          color={FORM_COLORS.ink}
          roughness={0.55}
          metalness={0}
          emissive={FORM_COLORS.deep}
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}
