import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';
import { MarkArrow } from '@/components/public/marks';
import { BsDate } from '@/components/ui/bs-date';
import { listPublishedPosts } from '@/lib/cms/public-queries';

/**
 * The three most recent posts.
 *
 * A quiet, ruled list rather than three more cards. By this point the page has
 * spent a sticky panel, a dark band, a ladder and a physics pile on being
 * looked at, and the writing is the one thing here that wants to look like
 * reading. It is deliberately the plainest thing on the page after the tier
 * ladder — the last beat before the close should let the reader's eye rest, or
 * the close has nothing to land against.
 *
 * The only motion is the number sliding aside on hover, which is the reference
 * film's treatment of a list row and costs one transform.
 *
 * Returns null when nothing is published — a "Writing" heading over an empty
 * state on a marketing page advertises that nobody has written anything.
 */
export async function RecentPosts() {
  const posts = (await listPublishedPosts()).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="stage px-6 pb-28 pt-16 sm:pb-36 sm:pt-24">
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
            className="link-arrow text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span>All posts</span>
            <MarkArrow className="size-5" />
          </Link>
        </div>

        <StaggerIn
          as="ul"
          onScroll
          className="mt-12 divide-y divide-border border-t border-border"
        >
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-wrap items-baseline gap-x-8 gap-y-3 py-8 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="numeric w-8 flex-none text-[11px] tracking-[0.2em] text-muted-foreground transition-transform duration-300 ease-out group-hover:translate-x-1">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="headline block text-[clamp(1.15rem,2.2vw,1.5rem)] transition-colors duration-200 group-hover:text-primary">
                    {post.title}
                  </span>
                  {post.excerpt ? (
                    <span className="mt-2 block max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </span>
                  ) : null}
                </span>

                {post.publishedAt ? (
                  <BsDate
                    date={post.publishedAt}
                    className="numeric shrink-0 text-[12px] text-muted-foreground"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </StaggerIn>
      </div>
    </section>
  );
}
