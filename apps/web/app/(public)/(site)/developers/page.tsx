/**
 * `/developers` — the integration documentation, rendered from
 * `docs/INTEGRATION.md` in the repository.
 *
 * Served to the public as `developer.softmato.com`, which is a rewrite onto
 * this path rather than a second application — see `apps/web/middleware.ts`.
 * The path keeps working either way, which is what makes the page testable
 * locally and in a preview deployment where no such subdomain exists.
 *
 * The furniture is the legal page's, because this is the same shape of page: a
 * long document, read by someone looking for one section, with a table of
 * contents. What differs is where the words come from — git, not the CMS.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { extractHeadings } from '@/lib/cms/headings';
import { integrationDoc } from '@/lib/developers/integration-doc';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { JsonLd } from '@/lib/seo/json-ld';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';
import { TocInline } from '@/components/public/toc/toc-inline';
import { TocRail } from '@/components/public/toc/toc-rail';

const { title, body } = integrationDoc();

/*
 * Read at build time, so `readFileSync` above never runs on a request and the
 * markdown file never has to be traced into the deployment bundle. Forced
 * rather than inferred: this page has no dynamic data today, and if something
 * later makes Next render it per-request, that should be a deliberate change
 * and not a silent one that starts touching the filesystem in production.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title,
  description:
    "The internal integration guide for Softmato's own SaaS product teams: invoices, checkout, webhooks, and the rules a live credential is held to. Not a self-service API.",
  alternates: { canonical: '/developers' },
};

export default function DevelopersPage() {
  const headings = extractHeadings(body);

  return (
    <div className="doc-grid">
      <article className="min-w-0">
        <JsonLd
          id="breadcrumbs"
          data={breadcrumbList([{ name: 'Developers' }])}
        />

        <PageHeader
          eyebrow="Developers · Softmato product teams"
          title={title}
          lead="One integration, and we handle eSewa, Khalti and the paperwork."
        />

        <AudienceNotice />

        <TocInline headings={headings} />

        <div className="mt-8">
          <Markdown anchors>{body}</Markdown>
        </div>

        <nav
          aria-label="Related"
          className="section-frame mt-12 rounded-lg p-5"
        >
          <p className="eyebrow">Before you go live</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The terms a live credential is issued under are the technical rules
            described above, written down.
          </p>

          <p className="mt-3 text-sm">
            <Link
              href="/legal/partner-terms"
              className="text-primary underline-offset-2 hover:underline"
            >
              Integration terms
            </Link>
          </p>
        </nav>
      </article>

      <TocRail headings={headings} />
    </div>
  );
}

/**
 * Who this page is for, above the fold and visually separate.
 *
 * The full explanation is the "Who this is for" section of the markdown, which
 * is the canonical statement and the one that travels with the repository.
 * This is a signpost to it, not a second copy: one sentence, because the reader
 * it exists for is an outside developer skimming for a sign-up button, and
 * they will not reach a body section to find out there isn't one.
 */
function AudienceNotice() {
  return (
    <aside
      aria-labelledby="audience-notice"
      className="section-frame mt-8 rounded-lg p-5"
    >
      <p id="audience-notice" className="eyebrow">
        For Softmato product teams
      </p>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This is our internal guide for the SaaS products we build and run
        ourselves. It is <strong>not a self-service API</strong> — there is no
        sign-up, and credentials are issued by us, to us.
      </p>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        If you need to take payments in Nepal,{' '}
        <Link
          href="/contact"
          className="text-primary underline-offset-2 hover:underline"
        >
          talk to us about building it
        </Link>{' '}
        — you get this same payment rail, wired up properly, without integrating
        anything yourself.
      </p>
    </aside>
  );
}
