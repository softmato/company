import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The measure, and the light, for an ordinary public page.
 *
 * Two jobs. The measure is the obvious one: the home page is a sequence of
 * full-bleed stages and cannot live inside a centred container, so the layout
 * stopped constraining and every other page asks for one here.
 *
 * The light is the less obvious one, and it is why this is a `.stage` with a
 * bloom in it rather than a bare `<div>`. The home page's whole idea is a
 * near-white ground with one emerald light-form on it; an inner page that
 * drops the light is a different site with the same typeface. The bloom here
 * is much quieter than a home section's — it sits behind the page title and
 * fades out before the body copy, so it reads as the same light seen from
 * further away rather than as a decoration on a document.
 *
 * `pt-36` clears the fixed header. Nothing pushes these pages down — the
 * header floats over them — so the measure has to do it itself.
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className="stage">
      <div
        className="bloom opacity-60"
        style={{ '--bloom-x': '50%', '--bloom-y': '-6%' } as React.CSSProperties}
      />

      <div className={cn('mx-auto w-full max-w-5xl px-6 pb-24 pt-36', className)}>
        {children}
      </div>
    </div>
  );
}
