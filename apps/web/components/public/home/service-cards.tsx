'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';

import { BorderBeam } from '@/components/motion/border-beam';
import { StaggerIn } from '@/components/motion/stagger-in';

export interface ServiceCard {
  slug: string;
  title: string;
  summary: string | null;
}

/**
 * Line icons for the corner of each card, keyed by slug for the reason
 * `lib/home/service-art.ts` gives. A service with no entry gets no icon
 * rather than another service's.
 */
const ICONS: Record<string, ReactNode> = {
  'product-engineering': (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  'web-applications': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" />
    </>
  ),
  'mobile-apps': (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  'ui-ux-design': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </>
  ),
  seo: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M8 11l2 2 3.5-4" />
    </>
  ),
  'maintenance-hosting': (
    <>
      <rect x="3" y="3.5" width="18" height="7" rx="1.5" />
      <rect x="3" y="13.5" width="18" height="7" rx="1.5" />
      <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
    </>
  ),
  'payment-integration': (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
};

/**
 * The published services as plain cards — title, summary, a way in — with a
 * beam running round each border. The laps are offset so neighbouring beams
 * never line up; they run only while the grid is on screen.
 *
 * At three columns the grid always ends on a full row: when the count is not
 * a multiple of three, the first one or two cards span two columns. A lone
 * card on the last row reads as an afterthought.
 */
export function ServiceCards({ services }: { services: ServiceCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const wide = (3 - (services.length % 3)) % 3;

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      el.toggleAttribute('data-inview', entry?.isIntersecting ?? false);
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <StaggerIn onScroll className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <Link
            key={service.slug}
            href={`/services/${service.slug}`}
            className={`group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-[var(--shadow-card)] ${i < wide ? 'lg:col-span-2' : ''}`}
          >
            <h3 className="headline text-[20px]">{service.title}</h3>
            {service.summary && (
              <p className="mt-2 line-clamp-3 max-w-[34ch] text-[14.5px] leading-relaxed text-muted-foreground">
                {service.summary}
              </p>
            )}

            <span className="mt-auto inline-flex items-center gap-1.5 pt-8 text-[14px] font-medium">
              Learn more
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>

            {ICONS[service.slug] && (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute bottom-5 right-5 size-14 text-foreground/20 transition-colors duration-300 group-hover:text-primary/60"
              >
                {ICONS[service.slug]}
              </svg>
            )}

            <BorderBeam delay={(-i * 9) / services.length} />
          </Link>
        ))}
      </StaggerIn>
    </div>
  );
}
