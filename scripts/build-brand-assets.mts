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
import { mkdir } from 'node:fs/promises';
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
 * Keys the white canvas out of a master and trims the border away.
 *
 * The supplied lockup is drawn on opaque white inside a square canvas, most of
 * which is empty. Dropped onto the social card as-is it reads as a white box
 * pasted onto a near-white ground — visibly a different tone — and the artwork
 * inside it is a fraction of the height it could be.
 *
 * So: every pixel that is essentially white becomes transparent, then `trim`
 * removes the now-transparent border. The result is the lockup and nothing
 * else, which can be scaled to fill the space it is given and will sit on any
 * ground, light or dark.
 *
 * The threshold is deliberately high (244). Lower, and the pale inner
 * highlights of the emblem's gradient start punching holes in the artwork.
 */
async function keyOutWhite(from: string): Promise<Buffer> {
  const { data, info } = await sharp(from)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i]! > 244 && data[i + 1]! > 244 && data[i + 2]! > 244) {
      data[i + 3] = 0;
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

  for (const job of JOBS) {
    const pad = job.pad ?? 0;
    const inner = Math.round(job.size * (1 - pad * 2));

    await sharp(job.from)
      .resize(inner, inner, {
        fit: 'contain',
        /* Transparent, so the extend below decides the ground. */
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: Math.round((job.size - inner) / 2),
        bottom: Math.round((job.size - inner) / 2),
        left: Math.round((job.size - inner) / 2),
        right: Math.round((job.size - inner) / 2),
        background: { r: 255, g: 255, b: 255, alpha: job.opaque ? 1 : 0 },
      })
      .flatten(job.opaque ? { background: '#ffffff' } : false)
      .png()
      .toFile(job.to);

    console.log(`  ${path.relative(ROOT, job.to)}  ${job.size}×${job.size}`);
  }

  /*
   * The lockup, keyed and trimmed, for the social card. Kept separate from the
   * master: structured data wants the logo on its own white ground, and the
   * card wants it on the card's.
   */
  const logoOg = path.join(BRAND, 'logo-og.png');
  await sharp(await keyOutWhite(MASTERS.logo)).png().toFile(logoOg);
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
