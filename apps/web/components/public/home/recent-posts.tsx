import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';
import { BsDate } from '@/components/ui/bs-date';
import { listPublishedPosts } from '@/lib/cms/public-queries';

/**
 * The three most recent posts.
 *
 * A quiet, ruled list rather than three more cards: the page has already spent
 * two sections on framed panels, and the writing is the one thing here that
 * wants to look like reading rather than like a product.
 *
 * Returns null when nothing is published — a "Latest writing" heading over an
 * empty state on a marketing page advertises that nobody has written anything.
 */
export async function RecentPosts() {
  const posts = (await listPublishedPosts()).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="stage px-6 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Writing</p>
            <h2 className="headline mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)]">
              What we have been working out
            </h2>
          </div>

          <Link
            href="/blog"
            className="text-[14px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            All posts
          </Link>
        </div>

        <StaggerIn onScroll className="mt-12 divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <article key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-7 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="headline text-[20px] transition-colors duration-200 group-hover:text-primary">
                    {post.title}
                  </h3>
                  {post.excerpt ? (
                    <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>

                {post.publishedAt ? (
                  <BsDate
                    date={post.publishedAt}
                    className="numeric shrink-0 text-[12px] text-muted-foreground"
                  />
                ) : null}
              </Link>
            </article>
          ))}
        </StaggerIn>
      </div>
    </section>
  );
}
