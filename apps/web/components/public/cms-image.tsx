import Image from 'next/image';

import { env } from '@/lib/env';

/**
 * A CMS image, optimised when we are allowed to and plain when we are not.
 *
 * Image fields accept an uploaded file *or* a pasted URL, so the host is not
 * knowable in advance. `next/image` throws at request time on a host missing
 * from `next.config.ts` `remotePatterns`, and the alternative — allowing every
 * host — turns the optimiser into an open image proxy anyone can point at
 * anything. So: our own bucket is optimised, and any other host renders as a
 * plain `<img>` rather than breaking the page.
 *
 * Server components only. `env` is server-only, which is what stops this being
 * imported into a client component by accident.
 */
function optimizable(src: string): boolean {
  if (!env.R2_PUBLIC_BASE_URL) return false;

  try {
    return new URL(src).origin === new URL(env.R2_PUBLIC_BASE_URL).origin;
  } catch {
    return false;
  }
}

interface CmsImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Rendered width at each breakpoint, so the optimiser picks a sane file. */
  sizes: string;
  className?: string | undefined;
}

export function CmsImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
}: CmsImageProps) {
  if (!optimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
    />
  );
}

interface CmsImageFillProps {
  src: string;
  alt: string;
  sizes: string;
  /** Applied to the image itself. The parent supplies the frame and its ratio. */
  className?: string | undefined;
}

/**
 * Fills a parent that is `relative` and carries its own aspect ratio.
 *
 * A frame with a known ratio is what keeps the layout from jumping once the
 * image loads — the CMS stores a URL and no dimensions, so the page cannot
 * reserve the right space any other way.
 */
export function CmsImageFill({
  src,
  alt,
  sizes,
  className,
}: CmsImageFillProps) {
  if (!optimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      />
    );
  }

  return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
}
