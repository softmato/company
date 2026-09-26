import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from 'ogl';

import { COMPOSITE_FRAGMENT, SCREEN_VERTEX, WAVE_FRAGMENT, WAVE_VERTEX } from './ripple-shaders';

/**
 * The WebGL half of `RippleAsset`: React Bits' RippleDistortion loop, made to
 * *stop*. The original renders every frame for the life of the page; here the
 * loop runs only while there are ripples alive, and once the pointer has left
 * and the last one has faded it calls `onIdle` so the wrapper can tear the
 * context down. On a page that already runs four WebGL scenes, a ripple costs
 * a context only while someone is actually stirring it.
 *
 * Imported dynamically by the wrapper, so `ogl` is not in the page's bundle
 * until the first hover.
 */
const MAX_WAVES = 60;
const START_SCALE = 1.5;
const LIFE_CONSTANT = Math.log(500);
const FIELD_SCALE = 0.5;

export interface RippleOptions {
  src: string;
  tint: [number, number, number];
  isHovering: () => boolean;
  onDrawn: () => void;
  onIdle: () => void;
  brushSize?: number;
  strength?: number;
  swirl?: number;
  rings?: number;
  spread?: number;
  fade?: number;
  spacing?: number;
  dispersion?: number;
  glint?: number;
  tintAmount?: number;
}

export function createRipple(mount: HTMLElement, o: RippleOptions) {
  const brushSize = o.brushSize ?? 70;
  const spread = o.spread ?? 4;
  const fade = o.fade ?? 1.4;
  const spacing = o.spacing ?? 12;

  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.className = 'absolute inset-0 size-full';
  mount.appendChild(canvas);

  const texture = new Texture(gl, {
    generateMipmaps: false,
    premultiplyAlpha: true,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  });

  const offsets = new Float32Array(MAX_WAVES * 2);
  const scales = new Float32Array(MAX_WAVES * 2);
  const opacities = new Float32Array(MAX_WAVES);
  const waves = Array.from({ length: MAX_WAVES }, () => ({
    x: 0,
    y: 0,
    scale: START_SCALE,
    target: START_SCALE,
    opacity: 0,
  }));
  let next = 0;

  const geometry = new Geometry(gl, {
    position: { size: 2, data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]) },
    uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]) },
    iOffset: { instanced: 1, size: 2, data: offsets },
    iScale: { instanced: 1, size: 2, data: scales },
    iOpacity: { instanced: 1, size: 1, data: opacities },
  });
  const waveProgram = new Program(gl, {
    vertex: WAVE_VERTEX,
    fragment: WAVE_FRAGMENT,
    uniforms: { uRings: { value: o.rings ?? 3 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  });
  waveProgram.setBlendFunc(gl.ONE, gl.ONE);
  const waveMesh = new Mesh(gl, { geometry, program: waveProgram, frustumCulled: false });

  const field = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  });

  const uniforms = {
    uTexture: { value: texture },
    uDisplacement: { value: field.texture },
    uTexel: { value: [1, 1] },
    uTint: { value: o.tint },
    uHighlight: { value: [1, 1, 1] },
    uStrength: { value: o.strength ?? 0.12 },
    uSwirl: { value: o.swirl ?? 1 },
    uDispersion: { value: o.dispersion ?? 0.25 },
    uGlint: { value: o.glint ?? 0.35 },
    uTintAmount: { value: o.tintAmount ?? 0.12 },
  };
  const compositeMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: SCREEN_VERTEX,
      fragment: COMPOSITE_FRAGMENT,
      uniforms,
      depthTest: false,
      depthWrite: false,
    }),
  });

  let width = 1;
  let height = 1;
  const resize = () => {
    width = Math.max(1, mount.clientWidth);
    height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height);
    const fw = Math.max(2, Math.round(width * FIELD_SCALE));
    const fh = Math.max(2, Math.round(height * FIELD_SCALE));
    field.setSize(fw, fh);
    uniforms.uTexel.value = [1 / fw, 1 / fh];
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(mount);

  const draw = () => {
    renderer.render({ scene: waveMesh, target: field, clear: true });
    renderer.render({ scene: compositeMesh });
  };

  let loaded = false;
  let disposed = false;
  let frame = 0;
  let last = 0;

  const image = new window.Image();
  image.decoding = 'async';
  image.onload = () => {
    if (disposed) return;
    texture.image = image;
    loaded = true;
    draw();
    o.onDrawn();
    kick();
  };
  image.src = o.src;

  const loop = (now: number) => {
    const delta = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const growth = 1 - Math.exp(-delta * 1.09);
    const decay = Math.exp((-delta * LIFE_CONSTANT) / fade);
    let alive = 0;

    waves.forEach((wave, i) => {
      if (wave.opacity > 0) {
        wave.opacity *= decay;
        wave.scale += (wave.target - wave.scale) * growth;
        if (wave.opacity < 0.002) wave.opacity = 0;
      }
      if (wave.opacity === 0) {
        opacities[i] = 0;
        return;
      }
      alive += 1;
      const half = (wave.scale * brushSize) / 2;
      offsets[i * 2] = (wave.x / width) * 2 - 1;
      offsets[i * 2 + 1] = (wave.y / height) * 2 - 1;
      scales[i * 2] = (half / width) * 2;
      scales[i * 2 + 1] = (half / height) * 2;
      opacities[i] = wave.opacity;
    });

    geometry.attributes.iOffset!.needsUpdate = true;
    geometry.attributes.iScale!.needsUpdate = true;
    geometry.attributes.iOpacity!.needsUpdate = true;
    draw();

    if (alive > 0) {
      frame = requestAnimationFrame(loop);
      return;
    }
    /* Settled: the last frame drawn is the plain image. */
    frame = 0;
    last = 0;
    if (!o.isHovering()) o.onIdle();
  };

  function kick() {
    if (!frame && loaded && !disposed) frame = requestAnimationFrame(loop);
  }

  let px = -1e4;
  let py = -1e4;
  const move = (e: PointerEvent) => {
    const rect = mount.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = height - ((e.clientY - rect.top) / rect.height) * height;
    if (Math.abs(x - px) <= spacing && Math.abs(y - py) <= spacing) return;
    px = x;
    py = y;
    const wave = waves[next]!;
    next = (next + 1) % MAX_WAVES;
    Object.assign(wave, {
      x,
      y,
      scale: START_SCALE,
      target: START_SCALE * spread,
      opacity: 1,
    });
    kick();
  };
  mount.addEventListener('pointermove', move);

  return {
    /** The pointer left; if nothing is still settling, hand back now. */
    leave() {
      if (!frame) o.onIdle();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeEventListener('pointermove', move);
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export type RippleEngine = ReturnType<typeof createRipple>;
