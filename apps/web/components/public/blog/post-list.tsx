'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * The post list and its tag filter.
 *
 * Dates arrive pre-formatted from the server. Formatting them here would pull
 * the Bikram Sambat converter into the client bundle to render a string that
 * never changes after load — the conversion is a render concern, but it is a
 * *server* render concern.
 *
 * Filtering is client-side and does not touch the URL. There are tens of
 * posts, not thousands, so a round trip per chip would be slower and no more
 * correct; a tag worth linking to directly deserves its own page rather than
 * a query string nobody can guess.
 */
export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  date: string | null;
  dateTime: string | null;
}

export function PostList({ posts }: { posts: PostSummary[] }) {
  const [active, setActive] = useState<string | null>(null);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const post of posts) for (const tag of post.tags) seen.add(tag);
    return [...seen].sort();
  }, [posts]);

  const visible = active
    ? posts.filter((post) => post.tags.includes(active))
    : posts;

  if (posts.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        title="Nothing published yet"
        description="Posts appear here once they are written in the panel and published."
      />
    );
  }

  return (
    <div>
      {tags.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-center gap-2">
          <Chip active={active === null} onClick={() => setActive(null)}>
            All
          </Chip>
          {tags.map((tag) => (
            <Chip
              key={tag}
              active={active === tag}
              onClick={() => setActive(active === tag ? null : tag)}
            >
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      {/*
        The count is the only feedback that a filter did anything when the
        result set happens to look similar. It is a live region so a screen
        reader hears the list change — a chip that silently reorders content
        below it is a change nobody announced.
      */}
      <p aria-live="polite" className="mt-4 text-[13px] text-muted-foreground">
        {active
          ? `${visible.length} ${visible.length === 1 ? 'post' : 'posts'} tagged ${active}`
          : `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}
      </p>

      <ul className="mt-4 divide-y divide-border border-t border-border">
        {visible.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block py-7 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="headline text-[20px] transition-colors duration-200 group-hover:text-primary">
                  {post.title}
                </h2>
                {post.date ? (
                  <time
                    dateTime={post.dateTime ?? undefined}
                    className="numeric shrink-0 text-[12px] text-muted-foreground"
                  >
                    {post.date}
                  </time>
                ) : null}
              </div>

              {post.excerpt ? (
                <p className="mt-2 max-w-[68ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              ) : null}

              {post.tags.length > 0 ? (
                <p className="mt-2.5 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3.5 text-[13px] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
