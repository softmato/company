/**
 * ThreeUI's Data Pixel Arc renderer (MIT, @designcodeio/threeui, source bundle
 * `predictive-arc`, file `dataPixelArcRenderer.ts`). Light mode is the source
 * unchanged. Dark mode differs in three ways: the canvas is cleared rather than
 * filled with `#030308`, so the section keeps its own ground and CSS bloom; it
 * draws through a cell buffer instead of a `fillRect` per cell (see
 * `drawDark`); and it has an opt-in `smooth` look without the grid.
 *
 * Canvas 2D, not WebGL — a grid of `pixelSize` squares lit along a dome.
 */
export type DataPixelArcMode = 'dark' | 'light';

export type DataPixelArcOptions = {
  mode: DataPixelArcMode;
  speed: number;
  pixelSize: number;
  arcCenter: number;
  arcDrop: number;
  thickness: number;
  brightness: number;
  hue: number;
  saturation: number;
  /**
   * Dark mode only: interpolate between cells, so the arc reads as one
   * continuous glow instead of a grid of squares. Not in the source; off by
   * default, which is the source's look.
   */
  smooth: boolean;
  /**
   * Dark mode only: how hard the 1px gutters between cells are cut, 0 to 1.
   * The source's look is 1; a low value over `smooth` leaves a faint grid
   * texture on the glow.
   */
  gutter: number;
};

export const DATA_PIXEL_ARC_DEFAULTS: DataPixelArcOptions = {
  mode: 'dark',
  speed: 1,
  pixelSize: 8,
  arcCenter: 0.4,
  arcDrop: 0.9,
  thickness: 0.35,
  brightness: 1,
  hue: 0,
  saturation: 1,
  smooth: false,
  gutter: 1,
};

function resolveMode(
  mode: DataPixelArcOptions['mode'] | number | string | undefined,
): DataPixelArcMode {
  if (mode === 'light' || mode === 1 || mode === '1') return 'light';
  return 'dark';
}

export function createDataPixelArcRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => DataPixelArcOptions,
) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  let width = 1;
  let height = 1;
  let time = 0;
  let lightBackground: CanvasGradient | null = null;

  /*
   * The dark path draws one buffer pixel per cell instead of one `fillRect`
   * per cell. The source built an `rgb()` string and issued a fill for each of
   * ~9,000 lit cells a frame — 17ms of main thread per frame, measured, on a
   * hero whose entrance and smooth scroll share that thread. Here the cells go
   * into an ImageData the size of the grid, one scaled `drawImage` puts them on
   * screen, and a repeating pattern erases the 1px gutter the source left by
   * drawing `pixelSize - 1` squares. Same pixels, a fraction of the work.
   */
  const cellCanvas = document.createElement('canvas');
  const cellContext = cellCanvas.getContext('2d');
  let cells: ImageData | null = null;
  let gutter: CanvasPattern | null = null;
  let gutterSize = 0;

  const drawDark = (options: DataPixelArcOptions) => {
    if (!cellContext) return;
    const size = options.pixelSize;
    const cols = Math.ceil(width / size);
    const rows = Math.ceil(height / size);
    if (!cells || cells.width !== cols || cells.height !== rows) {
      cellCanvas.width = cols;
      cellCanvas.height = rows;
      cells = cellContext.createImageData(cols, rows);
    }
    if (options.gutter > 0 && gutterSize !== size) {
      const tile = document.createElement('canvas');
      tile.width = size;
      tile.height = size;
      const tileContext = tile.getContext('2d');
      tileContext?.fillRect(size - 1, 0, 1, size);
      tileContext?.fillRect(0, size - 1, size, 1);
      gutter = context.createPattern(tile, 'repeat');
      gutterSize = size;
    }

    const data = cells.data;
    data.fill(0);
    const arcCenterY = height * options.arcCenter;
    const arcDrop = height * options.arcDrop;
    const thickness = height * options.thickness;
    const wave2 = new Float32Array(rows);
    for (let y = 0; y < rows; y += 1) {
      wave2[y] = Math.cos(y * size * 0.01 + time) * 0.1;
    }

    for (let x = 0; x < cols; x += 1) {
      const nx = ((x * size) / width) * 2 - 1;
      const falloff = Math.max(0, 1 - Math.pow(Math.abs(nx), 2.5));
      if (falloff <= 0) continue;
      const curveY = arcCenterY + Math.pow(Math.abs(nx), 1.8) * arcDrop;
      const wave1 = Math.sin(nx * 4 - time * 1.5) * 0.1;
      const top = Math.max(0, Math.floor((curveY - thickness) / size));
      const bottom = Math.min(rows - 1, Math.ceil((curveY + thickness) / size));
      for (let y = top; y <= bottom; y += 1) {
        let intensity = Math.max(
          0,
          1 - Math.abs(y * size - curveY) / thickness,
        );
        if (intensity <= 0.01) continue;
        intensity = Math.max(0, Math.min(1, intensity + wave1 + wave2[y]!));
        intensity *= falloff;
        if (intensity <= 0.02) continue;
        const coreStrength = Math.pow(intensity, 3);
        const middleStrength = Math.pow(intensity, 1.5);
        const i = (y * cols + x) * 4;
        data[i] = (30 * intensity + 100 * coreStrength) * options.brightness;
        data[i + 1] =
          (220 * middleStrength + 40 * coreStrength) * options.brightness;
        data[i + 2] = (80 * intensity + 50 * coreStrength) * options.brightness;
        data[i + 3] = intensity * 255;
      }
    }

    context.clearRect(0, 0, width, height);
    cellContext.putImageData(cells, 0, 0);

    if (options.smooth) {
      /*
       * Each buffer pixel holds its cell's top-left sample, and bilinear
       * filtering centres it in the cell, so shift back half a cell to keep
       * the arc where the grid version draws it.
       */
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        cellCanvas,
        -size / 2,
        -size / 2,
        cols * size,
        rows * size,
      );
    } else {
      context.imageSmoothingEnabled = false;
      context.drawImage(cellCanvas, 0, 0, cols * size, rows * size);
    }

    if (gutter && options.gutter > 0) {
      context.globalAlpha = Math.min(1, options.gutter);
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = gutter;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
    }
  };
  const resize = (nextWidth: number, nextHeight: number) => {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lightBackground = context.createLinearGradient(0, 0, 0, height);
    lightBackground.addColorStop(0, '#f8faf6');
    lightBackground.addColorStop(0.58, '#f3f6f1');
    lightBackground.addColorStop(1, '#edf1ec');
  };
  const render = () => {
    const options = getOptions();
    const isLight = resolveMode(options.mode) === 'light';
    if (!isLight) {
      drawDark(options);
      time += 0.02 * options.speed;
      return;
    }
    if (lightBackground) {
      context.fillStyle = lightBackground;
      context.fillRect(0, 0, width, height);
    }
    const cols = Math.ceil(width / options.pixelSize);
    const rows = Math.ceil(height / options.pixelSize);
    const arcCenterY = height * options.arcCenter;
    const arcDrop = height * options.arcDrop;
    const thickness = height * options.thickness;
    for (let x = 0; x < cols; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        const px = x * options.pixelSize;
        const py = y * options.pixelSize;
        const nx = (px / width) * 2 - 1;
        const curveY = arcCenterY + Math.pow(Math.abs(nx), 1.8) * arcDrop;
        let intensity = Math.max(0, 1 - Math.abs(py - curveY) / thickness);
        if (intensity <= 0.01) continue;
        const wave1 = Math.sin(nx * 4 - time * 1.5) * 0.1;
        const wave2 = Math.cos(py * 0.01 + time) * 0.1;
        intensity = Math.max(0, Math.min(1, intensity + wave1 + wave2));
        intensity *= Math.max(0, 1 - Math.pow(Math.abs(nx), 2.5));
        if (intensity <= 0.02) continue;
        const coreStrength = Math.pow(intensity, 3);
        const middleStrength = Math.pow(intensity, 1.5);
        let r: number;
        let g: number;
        let b: number;
        if (isLight) {
          // Sage edge pixels hold their shape on paper while the emerald core stays vivid.
          const pigment = Math.pow(intensity, 0.78);
          const inkStrength = Math.max(
            0.45,
            Math.min(1.35, options.brightness),
          );
          const paper = [238, 242, 237] as const;
          const ink = [
            192 - 172 * pigment - 10 * coreStrength,
            204 - 88 * pigment + 18 * coreStrength,
            193 - 132 * pigment + 4 * coreStrength,
          ] as const;
          r = Math.max(
            0,
            Math.min(
              255,
              Math.round(paper[0] + (ink[0] - paper[0]) * inkStrength),
            ),
          );
          g = Math.max(
            0,
            Math.min(
              255,
              Math.round(paper[1] + (ink[1] - paper[1]) * inkStrength),
            ),
          );
          b = Math.max(
            0,
            Math.min(
              255,
              Math.round(paper[2] + (ink[2] - paper[2]) * inkStrength),
            ),
          );
        } else {
          r = Math.floor(
            (30 * intensity + 100 * coreStrength) * options.brightness,
          );
          g = Math.floor(
            (220 * middleStrength + 40 * coreStrength) * options.brightness,
          );
          b = Math.floor(
            (80 * intensity + 50 * coreStrength) * options.brightness,
          );
        }
        context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        context.globalAlpha = isLight
          ? Math.min(1, 0.22 + Math.pow(intensity, 0.68) * 0.78)
          : intensity;
        context.fillRect(px, py, options.pixelSize - 1, options.pixelSize - 1);
      }
    }
    context.globalAlpha = 1;
    time += 0.02 * options.speed;
  };

  /**
   * How lit the arc is at a point (CSS px, canvas space), 0 to 1, at the frame
   * last drawn. The same formula the cells are coloured from, unquantised, so
   * something laid over the canvas can react to the light actually under it.
   */
  const intensityAt = (x: number, y: number) => {
    const options = getOptions();
    const nx = (x / width) * 2 - 1;
    const curveY =
      height * options.arcCenter +
      Math.pow(Math.abs(nx), 1.8) * height * options.arcDrop;
    let intensity = Math.max(
      0,
      1 - Math.abs(y - curveY) / (height * options.thickness),
    );
    if (intensity <= 0.01) return 0;
    const lastTime = time - 0.02 * options.speed;
    const wave1 = Math.sin(nx * 4 - lastTime * 1.5) * 0.1;
    const wave2 = Math.cos(y * 0.01 + lastTime) * 0.1;
    intensity = Math.max(0, Math.min(1, intensity + wave1 + wave2));
    return intensity * Math.max(0, 1 - Math.pow(Math.abs(nx), 2.5));
  };

  return { resize, render, intensityAt };
}
