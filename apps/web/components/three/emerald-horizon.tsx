'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { cn } from '@/lib/cn';

import {
  LUMINA_FRAGMENT_SHADER,
  LUMINA_VERTEX_SHADER,
} from './emerald-horizon-shaders';

/**
 * ThreeUI's `EmeraldHorizonBackground` (MIT, @designcodeio/threeui, source
 * revision d7769f7f), kept line for line except for three things:
 *
 * - It runs on the app's own `three` rather than the package's bundled r128
 *   copy, so the footer does not ship a second three.js.
 * - Its shader ends transparent — see `emerald-horizon-shaders.ts`. The
 *   package's version cannot be made transparent from outside; alpha is 1.
 * - `u_resolution` is in device pixels, matching `gl_FragCoord`. The original
 *   passes CSS pixels, so at a pixel ratio of 2 the horizon drew at half height
 *   and on a phone at a third.
 *
 * Pauses itself when scrolled off screen or when the tab is hidden.
 */
export const EMERALD_HORIZON_DEFAULTS = {
  speed: 1,
  waveScale: 1,
  variation: 1,
  glow: 1,
  vignette: 1,
  hue: 0,
} as const;

export function EmeraldHorizon({
  className,
  ...props
}: {
  speed?: number;
  waveScale?: number;
  variation?: number;
  glow?: number;
  vignette?: number;
  hue?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ ...EMERALD_HORIZON_DEFAULTS, ...props });

  useEffect(() => {
    optionsRef.current = { ...EMERALD_HORIZON_DEFAULTS, ...props };
  });

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_wave_scale: { value: 1 },
      u_variation: { value: 1 },
      u_glow: { value: 1 },
      u_vignette: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: LUMINA_VERTEX_SHADER,
      fragmentShader: LUMINA_FRAGMENT_SHADER,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    let frame = 0;
    let visible = true;
    let ready = false;
    let disposed = false;
    const start = performance.now();

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      renderer.setSize(bounds.width, bounds.height, false);
      uniforms.u_resolution.value.set(
        bounds.width * renderer.getPixelRatio(),
        bounds.height * renderer.getPixelRatio(),
      );
    };

    const render = (now: number) => {
      const options = optionsRef.current;
      uniforms.u_time.value = (now - start) * 0.001 * options.speed;
      uniforms.u_wave_scale.value = options.waveScale;
      uniforms.u_variation.value = options.variation;
      uniforms.u_glow.value = options.glow;
      uniforms.u_vignette.value = options.vignette;
      renderer.render(scene, camera);
      frame = visible && !document.hidden ? requestAnimationFrame(render) : 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (ready && visible && !frame) frame = requestAnimationFrame(render);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    resizeObserver.observe(host);
    intersection.observe(host);
    resize();

    /*
     * Compile before the first frame, through the browser's parallel shader
     * compilation. Rendering straight away links the program synchronously,
     * which measured as a ~270ms main-thread stall as the footer came into
     * view.
     */
    const compiled = renderer.compileAsync(scene, camera).catch(() => {});
    void compiled.then(() => {
      if (disposed) return;
      ready = true;
      if (visible && !frame) frame = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      /*
       * Not until the compile settles. three polls program readiness on a
       * timer, outside the promise, and a program disposed under it throws
       * "reading 'isReady'" as an uncaught error — every StrictMode remount
       * in dev, and any navigation away mid-compile in production.
       */
      void compiled.then(() => {
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      });
    };
  }, []);

  return (
    <div ref={hostRef} className={cn('relative size-full', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block size-full"
        style={{ filter: `hue-rotate(${props.hue ?? 0}deg)` }}
      />
    </div>
  );
}
