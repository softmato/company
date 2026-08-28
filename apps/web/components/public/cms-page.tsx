import { notFound } from 'next/navigation';

import { getPage } from '@/lib/cms/public-queries';
import { splitLede } from '@/lib/markdown/lede';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';

/**
 * A whole page driven by one `pages` row.
 *
 * Used by about, careers and the section index pages. An unpublished page
 * 404s rather than rendering empty — a blank page with a nav bar looks
 * broken, and 404 is the honest answer.
 *
 * The opening paragraph is lifted into the header as a lede, so a page reads
 * as title → statement → detail without the editor having to think about it.
 */
export async function CmsPage({
  slug,
  eyebrow,
  children,
}: {
  slug: string;
  eyebrow?: string | undefined;
  /** Rendered under the body, for pages with more than copy on them. */
  children?: React.ReactNode;
}) {
  const page = await getPage(slug);

  if (!page) notFound();

  const { lede, rest } = splitLede(page.body);

  return (
    <article>
      <PageHeader eyebrow={eyebrow} title={page.title} lead={lede} />
      {rest ? (
        <div className="mt-8">
          <Markdown>{rest}</Markdown>
        </div>
      ) : null}
      {children}
    </article>
  );
}
