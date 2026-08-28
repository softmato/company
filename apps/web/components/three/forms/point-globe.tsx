'use client';

import { useMemo } from 'react';
import { Float32BufferAttribute } from 'three';

import { FORM_COLORS } from './palette';
import { useIdleSpin } from './use-idle-spin';

const RADIUS = 2.7;
const COUNT = 2600;

/** Where the company is. The only real coordinate on the page. */
const KATHMANDU = { lat: 27.7172, lon: 85.324 };

/**
 * Latitude/longitude to a point on the sphere.
 *
 * Exported-shaped as a plain function rather than inlined because the marker
 * and the point field both need it, and getting the sign of `x` wrong puts
 * Kathmandu in the Pacific — which is the kind of mistake that survives review
 * on a globe made of undifferentiated dots.
 */
function onSphere(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;

  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/**
 * The globe of points — the reference's "Many locations" frame.
 *
 * The dots are distributed by the Fibonacci sphere rather than by nested
 * latitude/longitude loops. A lat/long grid bunches its points at the poles
 * and thins them at the equator, and on a slowly rotating globe that reads
 * unmistakably as two bright caps with a gap between them. The Fibonacci
 * spiral is near-uniform, which is what makes a sphere of loose dots read as a
 * surface at all.
 *
 * **It carries no counts.** The reference's equivalent frame is ringed with
 * figures — 50 locations, 40 of something else — and we do not have figures
 * like that, so the section says where the company is and stops. An invented
 * number on a marketing page is a claim about the business.
 */
export function PointGlobe() {
  const group = useIdleSpin(0.05);

  const positions = useMemo(() => {
    const points = new Float32Array(COUNT * 3);
    /* The golden angle: the increment that makes the spiral near-uniform. */
    const increment = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i += 1) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = increment * i;

      points[i * 3] = Math.cos(theta) * ring * RADIUS;
      points[i * 3 + 1] = y * RADIUS;
      points[i * 3 + 2] = Math.sin(theta) * ring * RADIUS;
    }

    return new Float32BufferAttribute(points, 3);
  }, []);

  const marker = useMemo(
    () => onSphere(KATHMANDU.lat, KATHMANDU.lon, RADIUS * 1.01),
    [],
  );

  return (
    <group ref={group} rotation={[0.32, 0, 0.16]}>
      <points>
        <bufferGeometry>
          {/*
            `attach` writes this onto the parent geometry's `position`
            attribute. The array is built once and never mutated, so no
            per-frame upload — the rotation happens on the group's transform.
          */}
          <primitive object={positions} attach="attributes-position" />
        </bufferGeometry>
        <pointsMaterial
          color={FORM_COLORS.glow}
          size={0.038}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>

      {/* Kathmandu. */}
      <mesh position={marker}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={FORM_COLORS.core} />
      </mesh>

      <mesh position={marker}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={FORM_COLORS.core}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
