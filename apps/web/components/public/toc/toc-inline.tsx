import type { Heading } from '@/lib/cms/headings';

import { TocLinks } from './toc-links';

/**
 * The same contents, for a viewport with no margin to put a rail in.
 *
 * Below `lg` there is one column, so the list goes back into the flow above
 * the body — and there it does need a frame, because inline it has nothing
 * but position to say it is navigation rather than the first paragraph.
 */
export function TocInline({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="Sections of this document"
      className="section-frame mt-8 rounded-lg p-5 lg:hidden"
    >
      <p className="eyebrow">On this page</p>

      <TocLinks headings={headings} className="mt-3 sm:columns-2" />
    </nav>
  );
}
