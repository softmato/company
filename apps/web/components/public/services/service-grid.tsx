import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { bulletHighlights } from '@/lib/markdown/sections';
import { StaggerIn } from '@/components/motion/stagger-in';
import { EmptyState } from '@/components/ui/empty-state';

import { ServiceArt } from './service-art';

interface ServiceItem {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
}

/**
 * Services as product tiles: icon, name, one line, and — unless `compact` —
 * the first three points from the service's own body as a checklist, so the
 * card says what is in it without anyone writing the list twice.
 */
export function ServiceGrid({
  services,
  compact = false,
}: {
  services: ServiceItem[];
  compact?: boolean;
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        className="mt-12"
        title="Nothing here yet"
        description="Services appear here once they are published."
      />
    );
  }

  return (
    <StaggerIn
      as="ul"
      onScroll
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {services.map((service) => {
        const points = compact ? [] : bulletHighlights(service.body);

        return (
          <li key={service.id}>
            <Link
              href={`/services/${service.slug}`}
              className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <article
                className={cn(
                  'flex h-full flex-col rounded-3xl border border-border bg-card shadow-card transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-float',
                  compact ? 'p-5' : 'p-6',
                )}
              >
                <div className="flex items-start justify-between">
                  <ServiceArt
                    slug={service.slug}
                    className={cn(
                      'text-foreground',
                      compact ? 'size-12' : 'size-16',
                    )}
                  />
                  <ArrowUpRight
                    className="size-5 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>

                <h3 className="headline mt-5 text-[19px]">{service.title}</h3>
                {service.summary ? (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {service.summary}
                  </p>
                ) : null}

                {points.length ? (
                  <div className="pt-6">
                    <ul className="space-y-2.5 border-t border-border pt-5">
                      {points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-2.5 text-[13.5px] leading-snug"
                        >
                          <Check
                            className="mt-0.5 size-4 flex-none text-primary"
                            aria-hidden="true"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            </Link>
          </li>
        );
      })}
    </StaggerIn>
  );
}
