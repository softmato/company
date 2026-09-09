import type { MarkAsset } from '@/lib/brand/mark-asset';

/**
 * One brand mark, drawn at a fixed square regardless of the file's own shape.
 *
 * A plain `<img>`, not `next/image`. These are two-kilobyte PNGs in `public/`
 * drawn at twenty-odd pixels; routing them through the image optimiser buys
 * nothing and costs a request per mark on a table with fifty rows. The same
 * reasoning `CmsImage` uses for its fallback path applies here permanently.
 *
 * `size` is the mark's **height**. The width comes from the asset's own ink
 * ratio, so a wordmark gets the room it needs and an emblem stays square.
 * `object-contain` never squashes, so the worst a missing ratio costs is a
 * small mark — but "small" on a 20px row means unreadable, which is what
 * `MarkAsset.ratio` exists to prevent.
 *
 * Decorative by default. Every current caller draws the mark beside the same
 * name it stands for, and a screen reader announcing "eSewa eSewa" is worse
 * than one that announces it once. Pass `alt` only when the mark is genuinely
 * alone.
 *
 * `plate` exists because the two sets of files are not the same kind of image.
 * The three wallet marks are RGBA with a transparent ground, so their colour
 * sits on whatever the theme provides and they are correct in dark mode for
 * free. The bank marks are RGB — the white is baked into the file — and on a
 * dark admin table each one would read as a white rectangle that looks like a
 * failed download. The plate makes that white deliberate: same white, inset,
 * with the corner radius doing the explaining.
 */
export function BrandMark({
  asset,
  size = 24,
  alt,
  plate = false,
  className,
}: {
  asset: MarkAsset;
  size?: number;
  alt?: string;
  plate?: boolean;
  className?: string;
}) {
  const width = Math.round(size * (asset.ratio ?? 1));

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      alt={alt ?? ''}
      {...(alt === undefined ? { 'aria-hidden': true } : {})}
      width={width}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width, height: size }}
      className={`shrink-0 rounded-[5px] object-contain${plate ? ' bg-white p-px ring-1 ring-black/5' : ''}${className ? ` ${className}` : ''}`}
    />
  );
}
