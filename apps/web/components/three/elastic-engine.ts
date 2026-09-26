import { Geometry, Mesh, Program, Renderer, Texture } from 'ogl';

import { ELASTIC_FRAGMENT, ELASTIC_VERTEX } from './elastic-shaders';

/**
 * The WebGL half of `ElasticPhoto`: React Bits' ElasticMesh, made to *stop*.
 *
 * The original simulates and renders every frame for the life of the page.
 * Here the loop runs only while the pointer is on the sheet or the sheet is
 * still springing back, and once it is flat again with the pointer gone it
 * calls `onIdle` so the wrapper can tear the context down and show the plain
 * photograph. Same lifecycle as `ripple-engine.ts`.
 *
 * The canvas is laid out `pad` larger than the photo on every side and the
 * sheet drawn at `FIT` of it, so at rest the sheet covers the photo exactly and
 * a bulge has room to swell past the photo's edge before the canvas clips it.
 *
 * Imported dynamically by the wrapper, so `ogl` is not in the page's bundle
 * until the first hover.
 */
const DIST = 4.6;
/** How far the sheet leans back while held, in radians. */
const HOLD_TILT = (10 * Math.PI) / 180;
const N = 25;
const STEP = 1 / 120;
const MAX_SUB = 5;

const STIFFNESS = 0.05;
const RETAIN = 1 - 0.2;
const COUPLING = 0.06 + 5 * 0.032;
const GRAB = 0.6 * 1.4;
const FORCE = 0.4 * 0.009;

export interface ElasticOptions {
  src: string;
  /** How much larger the canvas is than the photo, per side, as a fraction. */
  pad: number;
  /** Corner radius of the photo, in CSS pixels. */
  radius: number;
  /** Where the pointer is read — the photo, since the canvas takes none. */
  target: HTMLElement;
  isHovering: () => boolean;
  onDrawn: () => void;
  onIdle: () => void;
}

export type ElasticEngine = ReturnType<typeof createElastic>;

export function createElastic(mount: HTMLElement, o: ElasticOptions) {
  const FIT = 1 / (1 + o.pad * 2);
  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.className = 'absolute inset-0 size-full';
  mount.appendChild(canvas);

  const count = N * N;
  const aGrid = new Float32Array(count * 2);
  const aOffset = new Float32Array(count * 3);
  const aNormal = new Float32Array(count * 3);

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const idx = j * N + i;
      aGrid[idx * 2] = i / (N - 1);
      aGrid[idx * 2 + 1] = j / (N - 1);
      aNormal[idx * 3 + 2] = 1;
    }
  }

  const index = new Uint16Array((N - 1) * (N - 1) * 6);
  let t = 0;
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const a = j * N + i;
      index.set([a, a + N, a + 1, a + 1, a + N, a + N + 1], t);
      t += 6;
    }
  }

  const geometry = new Geometry(gl, {
    aGrid: { size: 2, data: aGrid },
    uv: { size: 2, data: aGrid },
    aOffset: { size: 3, data: aOffset },
    aNormal: { size: 3, data: aNormal },
    index: { data: index },
  });

  const texture = new Texture(gl, {
    generateMipmaps: false,
    flipY: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  });

  const uniforms = {
    tMap: { value: texture },
    uCover: { value: [1, 1] },
    uHighlight: { value: [1, 1, 1] },
    uShading: { value: 0.5 },
    uSheet: { value: [1, 1] },
    uRadius: { value: o.radius },
    uGridDensity: { value: 20 },
    uGridOpacity: { value: 0.28 },
    uGridColor: { value: [1, 1, 1] },
    uAspect: { value: 1 },
    uTilt: { value: 0 },
    uDist: { value: DIST },
    uFit: { value: FIT },
  };

  const program = new Program(gl, {
    vertex: ELASTIC_VERTEX,
    fragment: ELASTIC_FRAGMENT,
    transparent: true,
    cullFace: false,
    uniforms,
  });
  const mesh = new Mesh(gl, { geometry, program });

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const accel = new Float32Array(count * 3);

  let aspect = 1;
  const resize = () => {
    const w = Math.max(1, mount.clientWidth);
    const h = Math.max(1, mount.clientHeight);
    renderer.setSize(w, h);
    aspect = w / h;
    uniforms.uAspect.value = aspect;
    uniforms.uSheet.value = [w * FIT, h * FIT];
    if (image.naturalWidth) {
      const ratio = image.naturalWidth / image.naturalHeight;
      uniforms.uCover.value = [
        Math.min(aspect / ratio, 1),
        Math.min(ratio / aspect, 1),
      ];
    }
    for (let k = 0; k < count; k++) {
      baseX[k] = (aGrid[k * 2]! * 2 - 1) * aspect;
      baseY[k] = 1 - aGrid[k * 2 + 1]! * 2;
    }
    if (loaded) draw();
  };
  const observer = new ResizeObserver(resize);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, fresh: true };
  let tilt = 0;

  /* The inverse of the vertex shader's projection, for a point on the flat sheet. */
  const toPlane = (clientX: number, clientY: number) => {
    const rect = mount.getBoundingClientRect();
    const clipX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const clipY = 1 - ((clientY - rect.top) / rect.height) * 2;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const a = clipY / (ct * FIT * DIST);
    const py = (a * DIST) / (1 + a * st);
    const persp = DIST / (DIST - py * st);
    pointer.tx = (clipX * aspect) / (persp * FIT);
    pointer.ty = py;
    if (pointer.fresh) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      pointer.fresh = false;
    }
  };

  const substep = (held: boolean) => {
    const invR = 1 / GRAB;

    /* Neighbour sums, hoisted: the loop below runs ~1,500 times a frame. */
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let cnt = 0;
    const add = (n: number) => {
      sx += pos[n * 3]!;
      sy += pos[n * 3 + 1]!;
      sz += pos[n * 3 + 2]!;
      cnt++;
    };

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;
        const o3 = idx * 3;
        const ox = pos[o3]!;
        const oy = pos[o3 + 1]!;
        const oz = pos[o3 + 2]!;

        sx = 0;
        sy = 0;
        sz = 0;
        cnt = 0;
        if (i > 0) add(idx - 1);
        if (i < N - 1) add(idx + 1);
        if (j > 0) add(idx - N);
        if (j < N - 1) add(idx + N);

        let ax = -STIFFNESS * ox + COUPLING * (sx - cnt * ox);
        let ay = -STIFFNESS * oy + COUPLING * (sy - cnt * oy);
        let az = -STIFFNESS * oz + COUPLING * (sz - cnt * oz);

        if (held) {
          const dx = pointer.x - (baseX[idx]! + ox);
          const dy = pointer.y - (baseY[idx]! + oy);
          const d = Math.sqrt(dx * dx + dy * dy);
          const tn = d * invR;
          if (tn < 1) {
            const bump = 1 - tn * tn;
            az += FORCE * bump * bump * 6;
            if (d > 1e-4) {
              const dir = (FORCE * tn * (1 - tn) * (1 - tn) * 6.75 * 1.6) / d;
              ax += dx * dir;
              ay += dy * dir;
            }
          }
        }

        accel[o3] = ax;
        accel[o3 + 1] = ay;
        accel[o3 + 2] = az;
      }
    }

    for (let k = 0; k < count * 3; k++) {
      vel[k] = (vel[k]! + accel[k]!) * RETAIN;
      pos[k] = Math.max(-1.2, Math.min(1.2, pos[k]! + vel[k]!));
    }
  };

  /* Normals and offsets to the GPU; returns how far from flat the sheet is. */
  const commit = () => {
    let motion = 0;
    const px = (k: number) => baseX[k]! + pos[k * 3]!;
    const py = (k: number) => baseY[k]! + pos[k * 3 + 1]!;
    const pz = (k: number) => pos[k * 3 + 2]!;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;
        const o3 = idx * 3;
        const l = i > 0 ? idx - 1 : idx;
        const r = i < N - 1 ? idx + 1 : idx;
        const d = j > 0 ? idx - N : idx;
        const u = j < N - 1 ? idx + N : idx;

        const txx = px(r) - px(l);
        const txy = py(r) - py(l);
        const txz = pz(r) - pz(l);
        const tyx = px(u) - px(d);
        const tyy = py(u) - py(d);
        const tyz = pz(u) - pz(d);

        let nx = txy * tyz - txz * tyy;
        let ny = txz * tyx - txx * tyz;
        let nz = txx * tyy - txy * tyx;
        if (nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        aNormal[o3] = nx / len;
        aNormal[o3 + 1] = ny / len;
        aNormal[o3 + 2] = nz / len;

        for (let c = 0; c < 3; c++) {
          aOffset[o3 + c] = pos[o3 + c]!;
          motion = Math.max(
            motion,
            Math.abs(pos[o3 + c]!),
            Math.abs(vel[o3 + c]!) * 10,
          );
        }
      }
    }
    geometry.attributes.aOffset!.needsUpdate = true;
    geometry.attributes.aNormal!.needsUpdate = true;
    return motion;
  };

  const draw = () => renderer.render({ scene: mesh });

  let loaded = false;
  let disposed = false;
  let frame = 0;
  let last = 0;
  let acc = 0;

  const loop = (now: number) => {
    const dt = last ? Math.min(0.25, (now - last) / 1000) : 1 / 60;
    last = now;
    /* Not held until the first move says where: otherwise it grabs the centre. */
    const held = o.isHovering() && !pointer.fresh;

    const k = 1 - Math.exp(-dt / 0.06);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    tilt += ((held ? HOLD_TILT : 0) - tilt) * (1 - Math.exp(-dt / 0.35));
    uniforms.uTilt.value = tilt;

    acc += dt;
    for (let sub = 0; acc >= STEP && sub < MAX_SUB; sub++) {
      substep(held);
      acc -= STEP;
    }
    if (acc > STEP) acc = 0;

    const motion = commit();
    const leaning = Math.abs((held ? HOLD_TILT : 0) - tilt) > 1e-3;
    const settled = motion < 1e-4 && !leaning;

    if (!settled || held) {
      draw();
      frame = requestAnimationFrame(loop);
      return;
    }

    /* Flat again with nobody on it: draw it square once and hand back. */
    pos.fill(0);
    vel.fill(0);
    tilt = 0;
    uniforms.uTilt.value = 0;
    commit();
    draw();
    frame = 0;
    last = 0;
    o.onIdle();
  };

  function kick() {
    if (!frame && loaded && !disposed) frame = requestAnimationFrame(loop);
  }

  const move = (e: PointerEvent) => {
    toPlane(e.clientX, e.clientY);
    kick();
  };
  o.target.addEventListener('pointermove', move);

  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => {
    if (disposed) return;
    texture.image = image;
    loaded = true;
    resize();
    observer.observe(mount);
    draw();
    o.onDrawn();
    kick();
  };
  image.src = o.src;

  return {
    /** The pointer left; let the sheet spring back, then hand back. */
    leave() {
      pointer.fresh = true;
      if (frame) return;
      if (loaded) kick();
      else o.onIdle();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      o.target.removeEventListener('pointermove', move);
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
