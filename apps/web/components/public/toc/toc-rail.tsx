import type { Heading } from '@/lib/cms/headings';

import { TocLinks } from './toc-links';

/**
 * "On this page", parked at the top right of a long document.
 *
 * It is the second column of `.doc-grid`, which pushes that column out past
 * the reading measure towards the edge of the window. It is `sticky` inside
 * the column rather than `fixed`, so it releases at the foot of the article
 * instead of hanging over the footer — but its sticky offset equals the page's
 * top padding, so it is already stuck when the page loads and does not shift
 * by a pixel as the reader scrolls. Both numbers live on `.doc-rail` in
 * marketing.css, where the comment explains why they have to match.
 *
 * No frame around it. The reference sets this rail as plain text on the page
 * ground, and a bordered card in the margin reads as a second piece of content
 * competing with the one being read; brightness alone carries the current
 * section.
 */
export function TocRail({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;

  return (
    <div className="hidden lg:block">
      <nav aria-label="Sections of this document" className="doc-rail">
        <p className="eyebrow">On this page</p>

        <TocLinks headings={headings} className="mt-4" />
      </nav>
    </div>
  );
}
