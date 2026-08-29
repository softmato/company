/**
 * Generates every derived brand image from the three masters in
 * `apps/web/public/brand/`.
 *
 * Run it after replacing a master:
 *
 *     pnpm brand:build
 *
 * Why a script rather than six exports from a design tool: the favicon, the
 * touch icon and the two manifest icons are the same drawing at four sizes.
 * Cut by hand, they drift — and the one that drifts is always the favicon,
 * because it is the one nobody looks at until it is a year out of date in
 * everyone's bookmarks bar.
 *
 * The script is deliberately tolerant of missing masters: it reports what it
 * could not find and exits non-zero, rather than half-generating a set. A
 * partial icon set is worse than none, because the browser will happily serve
 * the stale file that is still sitting there.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'apps/web/public/brand');
const APP = path.join(ROOT, 'apps/web/app');

/*
 * sharp ships with Next but is not a direct dependency of this workspace, so
 * it is resolved from the web app rather than assumed to be hoisted. If that
 * ever fails, `pnpm --filter @softmato/web add -D sharp` is the fix.
 */
const require = createRequire(path.join(ROOT, 'apps/web/package.json'));
const sharp = require('sharp') as typeof import('sharp');

interface Job {
  from: string;
  to: string;
  size: number;
  /** Padding as a fraction of the canvas, for icons that need breathing room. */
  pad?: number;
  /** Opaque ground. Omit to keep the canvas transparent. */
  opaque?: boolean;
}

const MASTERS = {
  logo: path.join(BRAND, 'logo.png'),
  mark: path.join(BRAND, 'mark.png'),
  stamp: path.join(BRAND, 'stamp.png'),
};

const JOBS: Job[] = [
  /*
   * The favicon. Next serves `app/icon.png` at every size a browser asks for,
   * so one 512 source covers 16, 32 and 48 — but the mark is generated square
   * and padded here, because a glyph rendered edge to edge reads as a smudge
   * in a tab strip.
   */
  { from: MASTERS.mark, to: path.join(APP, 'icon.png'), size: 512, pad: 0.1 },
  /*
   * Apple touch icon. 180×180 is the size iOS actually requests, and it is the
   * one icon that must be opaque: iOS composites a transparent PNG onto black,
   * not onto the home screen wallpaper, so the mark's dark blue end would
   * disappear into it. White, matching --background.
   */
  {
    from: MASTERS.mark,
    to: path.join(APP, 'apple-icon.png'),
    size: 180,
    pad: 0.12,
    opaque: true,
  },
  {
    from: MASTERS.mark,
    to: path.join(BRAND, 'mark-192.png'),
    size: 192,
    pad: 0.1,
  },
  {
    from: MASTERS.mark,
    to: path.join(BRAND, 'mark-512.png'),
    size: 512,
    pad: 0.1,
  },
];

/**
 * Strips a master's flat background and trims to the artwork.
 *
 * The generated masters arrive on whatever ground the tool felt like: the
 * first mark came back transparent, the lockup on opaque white, the green mark
 * on solid black. Dropped in as-is, a white master reads as a white box pasted
 * onto the near-white social card, and a black one is worse.
 *
 * So the background is detected rather than assumed — a hardcoded "key out
 * white" silently did nothing to the black master, which is the bug this
 * function exists to make impossible. Corners are sampled because that is
 * where a logo canvas is always background.
 *
 * The two thresholds are not symmetrical, and both were measured rather than
 * guessed:
 *
 *   - **White at >244.** Lower, and the pale inner highlights of the emblem's
 *     gradient start punching holes through the artwork.
 *   - **Black at <=2.** The black master's histogram is a wall: 1.12M pixels
 *     at 0–1, then a cliff, with the artwork's darkest greens starting at 2.
 *     At a threshold of 10 the dark end of the top stroke loses its tip.
 */
async function keyFlatBackground(from: string): Promise<Buffer> {
  const { data, info } = await sharp(from)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = (x: number, y: number) => {
    const at = (y * info.width + x) * info.channels;
    return [data[at]!, data[at + 1]!, data[at + 2]!, data[at + 3]!] as const;
  };

  const corners = [
    px(0, 0),
    px(info.width - 1, 0),
    px(0, info.height - 1),
    px(info.width - 1, info.height - 1),
  ];

  /* Already cut out: nothing to key, just tighten the box. */
  if (corners.every((c) => c[3] === 0)) {
    return sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels as 4,
      },
    })
      .trim()
      .png()
      .toBuffer();
  }

  const white = corners.every((c) => c[0] > 244 && c[1] > 244 && c[2] > 244);
  const black = corners.every((c) => Math.max(c[0], c[1], c[2]) <= 2);

  if (!white && !black) {
    console.warn(
      `  ! ${path.basename(from)} has no flat white or black background ` +
        `(corner ${corners[0]!.slice(0, 3).join(',')}). Left as-is — if it ` +
        `shows as a box on the social card, re-export it on white, on black, ` +
        `or with transparency.`,
    );
  } else {
    for (let i = 0; i < data.length; i += info.channels) {
      const hit = white
        ? data[i]! > 244 && data[i + 1]! > 244 && data[i + 2]! > 244
        : Math.max(data[i]!, data[i + 1]!, data[i + 2]!) <= 2;

      if (hit) data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels as 4,
    },
  })
    .trim()
    .png()
    .toBuffer();
}

/** One square PNG: the artwork contained, padded, on a chosen ground. */
async function squarePng(
  from: Buffer | string,
  size: number,
  pad: number,
  opaque = false,
): Promise<Buffer> {
  const inner = Math.round(size * (1 - pad * 2));

  /*
   * The two margins are derived from each other rather than both rounded, so
   * they sum to exactly `size - inner`. Rounding each independently made a
   * 180px touch icon 181px and put a 17×17 PNG inside the 16×16 slot of the
   * .ico — off by one in the direction that makes an icon look soft.
   */
  const before = Math.floor((size - inner) / 2);
  const after = size - inner - before;

  return (
    sharp(from)
      /*
       * Trim to the artwork before scaling. The mark's canvas is 3:2 with a
       * transparent border, so containing it in a square left the glyph filling
       * only the middle band — at 16px that is about ten usable pixels of
       * height, and the result reads as a smudge. Trimming first lets the glyph
       * use the whole box.
       */
      .trim()
      .resize(inner, inner, {
        fit: 'contain',
        /* Transparent, so the extend below decides the ground. */
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: before,
        bottom: after,
        left: before,
        right: after,
        background: { r: 255, g: 255, b: 255, alpha: opaque ? 1 : 0 },
      })
      .flatten(opaque ? { background: '#ffffff' } : false)
      .png()
      .toBuffer()
  );
}

/**
 * Packs several PNGs into one `.ico`.
 *
 * The ICO container is a 6-byte header, one 16-byte directory entry per image,
 * then the image payloads. Since Vista, an entry's payload may be a PNG rather
 * than a raw bitmap, which every browser in use understands — so the same
 * buffers `squarePng` already produces go in unchanged, and there is no BMP
 * encoder to write or maintain.
 *
 * A width or height byte of 0 means 256; nothing here is that large, but the
 * encoding is why the fields are one byte wide.
 */
async function buildIco(from: Buffer, sizes: number[]): Promise<Buffer> {
  const images = await Promise.all(
    sizes.map((size) => squarePng(from, size, 0.08)),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((png, index) => {
    const at = index * 16;
    directory.writeUInt8(sizes[index]! & 0xff, at);
    directory.writeUInt8(sizes[index]! & 0xff, at + 1);
    directory.writeUInt8(0, at + 2); // palette size, 0 for true colour
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...images]);
}

async function main() {
  const missing = Object.entries(MASTERS)
    .filter(([, file]) => !existsSync(file))
    .map(([name, file]) => `  ${name}: ${path.relative(ROOT, file)}`);

  if (missing.length > 0) {
    console.error(
      `Missing brand master${missing.length > 1 ? 's' : ''}:\n${missing.join('\n')}\n\n` +
        `Save the three source images into apps/web/public/brand/ first.\n` +
        `See apps/web/public/brand/README.md for what each one is.`,
    );
    process.exit(1);
  }

  await mkdir(BRAND, { recursive: true });

  /*
   * The mark goes through the same keyer as the lockup. It happens to be
   * transparent today, but the next export may not be — and an icon set built
   * from a mark still sitting on its black canvas is a black square.
   */
  const markArt = await keyFlatBackground(MASTERS.mark);

  for (const job of JOBS) {
    const art = job.from === MASTERS.mark ? markArt : job.from;
    const png = await squarePng(art, job.size, job.pad ?? 0, job.opaque);
    await writeFile(job.to, png);

    console.log(`  ${path.relative(ROOT, job.to)}  ${job.size}×${job.size}`);
  }

  /*
   * favicon.ico, rebuilt from the mark.
   *
   * `icon.png` alone is not enough. Chrome asks for `/favicon.ico` by path
   * before it reads the `<link rel="icon">` tag, and Next serves whatever
   * `app/favicon.ico` contains — which was still the framework's boilerplate
   * triangle, so the tab showed the Vercel logo on a fully branded site.
   */
  const icoPath = path.join(APP, 'favicon.ico');
  await writeFile(icoPath, await buildIco(markArt, [16, 32, 48]));
  console.log(`  ${path.relative(ROOT, icoPath)}  16+32+48`);

  /*
   * The lockup, keyed and trimmed, for the social card. Kept separate from the
   * master: structured data wants the logo on its own white ground, and the
   * card wants it on the card's.
   */
  const logoOg = path.join(BRAND, 'logo-og.png');
  await sharp(await keyFlatBackground(MASTERS.logo))
    .png()
    .toFile(logoOg);
  const ogMeta = await sharp(logoOg).metadata();
  console.log(
    `  ${path.relative(ROOT, logoOg)}  ${ogMeta.width}×${ogMeta.height} (keyed, trimmed)`,
  );

  /*
   * The stamp and the logo are copied through unchanged, only verified. They
   * are used at their natural size — the stamp on a PDF invoice, the logo in
   * structured data — and resampling either one here would only lose detail.
   */
  for (const [name, file] of Object.entries(MASTERS)) {
    const meta = await sharp(file).metadata();
    console.log(`  ${name}: ${meta.width}×${meta.height} (master, unchanged)`);

    if (name === 'logo' && (meta.width ?? 0) < 1000) {
      console.warn(
        `  ! logo.png is only ${meta.width}px wide. The social card draws it ` +
          `at ~600px; below 1000px it will look upscaled.`,
      );
    }
    if (name !== 'logo' && (meta.width ?? 0) < 512) {
      console.warn(
        `  ! ${name}.png is only ${meta.width}px wide. 512px minimum — the ` +
          `generator never upscales.`,
      );
    }
  }

  console.log('\nBrand assets built.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
