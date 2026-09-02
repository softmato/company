import Link from 'next/link';

import { cn } from '@/lib/cn';
import { StaggerIn } from '@/components/motion/stagger-in';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Linked cards for a collection index — services, products, blog posts.
 * One component rather than three near-identical lists.
 *
 * The cards match the home page's service cards exactly: framed panel, mono
 * ordinal at the top left, and a lift on hover. An index page and the home
 * page's strip are showing the same rows, and showing them two different ways
 * makes the site feel assembled from parts.
 *
 * `columns` is a layout choice the caller owns because it depends on how much
 * each card has to say: a service summary is a sentence and tiles two-up
 * happily, a legal document is a title and wants the full width.
 */
export interface CardItem {
  key: string;
  href: string;
  title: string;
  description?: string | null;
  /** Small right-aligned label: a date, a version, anything short. */
  meta?: string | null;
}

export function CardList({
  items,
  empty,
  columns = 1,
}: {
  items: CardItem[];
  empty: string;
  columns?: 1 | 2;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        className="mt-12"
        title="Nothing here yet"
        description={empty}
      />
    );
  }

  return (
    <StaggerIn
      as="ul"
      onScroll
      className={cn('mt-12 grid gap-4', columns === 2 && 'sm:grid-cols-2')}
    >
      {items.map((item, index) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <article className="section-frame flex h-full flex-col p-6 transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-float">
              <div className="flex items-baseline justify-between gap-4">
                <span className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.meta ? (
                  <span className="numeric shrink-0 text-[11px] text-muted-foreground">
                    {item.meta}
                  </span>
                ) : null}
              </div>

              <h2 className="headline mt-6 text-[20px]">{item.title}</h2>

              {item.description ? (
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              ) : null}

              <span className="mt-auto pt-8 text-[13px] font-medium text-primary">
                Read more
              </span>
            </article>
          </Link>
        </li>
      ))}
    </StaggerIn>
  );
}
