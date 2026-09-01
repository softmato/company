'use client';

import type { Heading } from '@/lib/cms/headings';
import { cn } from '@/lib/cn';

import { useActiveHeading } from './use-active-heading';

/**
 * The links themselves, shared by the rail and the small-screen block.
 *
 * Ordinary anchors: they resolve before any JavaScript arrives, and a clause
 * can be linked to directly from an email. The active state is the only thing
 * the client adds, and losing it costs nothing but the highlight.
 */
export function TocLinks({
  headings,
  className,
}: {
  headings: Heading[];
  className?: string | undefined;
}) {
  const active = useActiveHeading(headings);

  return (
    <ul className={cn('space-y-0.5 text-[13px]', className)}>
      {headings.map(({ id, text }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            aria-current={active === id ? 'location' : undefined}
            className={cn(
              'block py-1 leading-snug text-muted-foreground transition-colors duration-150 hover:text-foreground',
              active === id && 'font-medium text-foreground',
            )}
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  );
}
