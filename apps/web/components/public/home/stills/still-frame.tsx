import { cn } from '@/lib/cn';

/**
 * The shell every service still is drawn inside.
 *
 * The reference film holds a soft grey panel on the left of its features
 * chapter and floats product cards inside it. The panel matters as much as the
 * cards: it gives three differently-shaped stills one silhouette, so swapping
 * between them changes the contents rather than the composition.
 *
 * **Everything inside is `aria-hidden`.** These are drawings of the kind of
 * screen a piece of work produces, not screenshots and not data. A screen
 * reader announcing "Ledger. 4402. NPR 18,500" would be reading out numbers
 * that describe nothing. The words that carry the meaning are in the step
 * beside it, which is real text.
 */
export function StillFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate grid aspect-[4/3] place-items-center rounded-3xl bg-surface p-5 sm:p-8',
        className,
      )}
    >
      {/*
        The bloom the film puts behind its panel, dimmed right down. On a light
        ground this is a tint, not a glow — see the note at the top of
        marketing.css about why these are gradients rather than a blur.
      */}
      <div
        className="bloom opacity-50"
        style={{ '--bloom-x': '68%', '--bloom-y': '82%' } as React.CSSProperties}
      />
      <div className="w-full">{children}</div>
    </div>
  );
}
