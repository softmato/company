/**
 * `/client-portal` — the client portal, shown to anyone: the real project
 * screen (`ProjectView`) over a sample project, with every control that
 * writes switched off. The preview frame shows the in-app sample shop.
 *
 * Rebuilt daily so the sample's dates stay counted from today, at the cost of
 * one render a day rather than one per visit.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import { MarkArrow } from '@/components/public/marks';
import { PageHeader } from '@/components/public/page-header';
import { ProjectView } from '@/components/portal/project-view';
import { env } from '@/lib/env';
import { PORTAL_HOST } from '@/lib/home/live-preview';
import { DEMO_PREVIEW_SLUG, demoBundle } from '@/lib/portal/demo';
import { previewUrl } from '@/lib/projects/preview';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { webPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';

export const revalidate = 86_400;

const TITLE = 'See the client portal';
const LEAD =
  'This is the page a client opens to follow their project: the site in progress, every stage, work to approve, files and messages. Below is a sample project, exactly as the portal shows it.';

export const metadata: Metadata = {
  title: TITLE,
  description: LEAD,
  alternates: { canonical: '/client-portal' },
};

export default function ClientPortalDemoPage() {
  return (
    <article>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: TITLE }])} />
      <JsonLd
        id="page"
        data={webPageNode({
          path: '/client-portal',
          name: TITLE,
          description: LEAD,
        })}
      />

      <PageHeader eyebrow="Client portal · demo" title={TITLE} lead={LEAD} />

      <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-background shadow-float">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
            <Lock className="size-3.5 text-emerald-600" aria-hidden="true" />
            {PORTAL_HOST}/projects
          </span>
          <span className="ml-auto rounded-full bg-amber-500/12 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Sample project · buttons are off
          </span>
        </div>
        <div className="bg-[radial-gradient(70%_40%_at_0%_0%,rgba(16,185,129,0.08),transparent),radial-gradient(60%_40%_at_100%_30%,rgba(139,92,246,0.06),transparent)] p-3 sm:p-6">
          <ProjectView
            bundle={demoBundle()}
            previewSrc={previewUrl(DEMO_PREVIEW_SLUG, env.NEXT_PUBLIC_APP_URL)}
            demo
          />
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
        <Link
          href="/contact"
          className="link-arrow text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>Start a project</span>
          <MarkArrow className="size-5" />
        </Link>
        <Link
          href="/how-we-work"
          className="link-arrow text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>How we handle your project</span>
          <MarkArrow className="size-5" />
        </Link>
      </div>
    </article>
  );
}
