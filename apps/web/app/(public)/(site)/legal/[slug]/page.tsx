import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getLegalDocument,
  listPublishedLegalDocuments,
  publishedSlugs,
} from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { isIndexableLegalDocument } from '@/lib/cms/legal-readiness';
import { resolveTokens } from '@/lib/cms/tokens';
import { getSettings } from '@/lib/settings/queries';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { legalPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { extractHeadings } from '@/lib/cms/headings';
import { formatBsWithAd } from '@/lib/format/date';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';
import { TocInline } from '@/components/public/toc/toc-inline';
import { TocRail } from '@/components/public/toc/toc-rail';

export async function generateStaticParams() {
  const slugs = await publishedSlugs('legal');
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/legal/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getLegalDocument(slug);

  if (!doc) return { title: 'Not found' };

  /*
   * A policy that still carries its "not yet reviewed" banner or an unfilled
   * `[confirm: …]` marker is reachable, linked from the footer and rendering
   * fine — and is not something a search engine should keep a copy of.
   * Publishing is the founder's call; indexing is a separate and much harder
   * thing to undo, because the placeholder text goes on appearing in results
   * long after the document is fixed.
   *
   * `follow: true` so the links out of the page still carry weight. The guard
   * clears itself the moment the markers are edited out — see
   * lib/cms/legal-readiness.ts, the same rule `pnpm legal:check` enforces
   * before a deploy.
   */
  const indexable = isIndexableLegalDocument(
    resolveTokens(doc.body, await getSettings()),
  );

  return {
    ...metadataFor(doc, { path: `/legal/${slug}` }),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function LegalDocumentPage({
  params,
}: PageProps<'/legal/[slug]'>) {
  const { slug } = await params;
  const doc = await getLegalDocument(slug);

  if (!doc) notFound();

  /*
   * Company details are `{{settings.key}}` tokens in the stored body, filled in
   * from the admin panel as the page renders — see lib/cms/tokens.ts. Resolved
   * before the headings are extracted so a token can never end up in an anchor
   * id, and before `Markdown` so a reader never sees the raw brace syntax.
   */
  const body = resolveTokens(doc.body, await getSettings());

  const headings = extractHeadings(body);
  const others = (await listPublishedLegalDocuments()).filter(
    (other) => other.slug !== doc.slug,
  );

  return (
    /*
     * Two columns from `lg` up: the document, and the "on this page" rail out
     * at the right edge of the window. The rail is a sibling of the article
     * rather than a block inside it, because a `sticky` element can only
     * travel inside its own parent — nested in the prose it would stop at the
     * first paragraph. `.doc-grid` carries the columns and the breakout.
     *
     * Below `lg` the grid collapses and `TocInline` takes over in the flow.
     */
    <div className="doc-grid">
      <article className="min-w-0">
        <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: doc.title }])} />
        <JsonLd id="policy" data={legalPageNode(doc)} />

        <PageHeader eyebrow="Legal" title={doc.title} />

        {/*
         * Version and effective date are stated on the page, not just stored.
         * A policy a customer cannot date is a policy they cannot rely on.
         */}
        <p className="numeric mt-3 text-xs text-muted-foreground">
          Version {doc.version}
          {doc.effectiveAt
            ? ` · in effect from ${formatBsWithAd(doc.effectiveAt)}`
            : ''}
        </p>

        <TocInline headings={headings} />

        <div className="mt-8">
          <Markdown anchors>{body}</Markdown>
        </div>

        {others.length > 0 ? (
          <nav
            aria-label="Other policies"
            className="section-frame mt-12 rounded-lg p-5"
          >
            <p className="eyebrow">Other policies</p>

            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/legal/${other.slug}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>

      <TocRail headings={headings} />
    </div>
  );
}
