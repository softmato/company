/**
 * `/how-we-work` — how Softmato handles a client's project, written for the
 * client. Copy in `lib/process/steps.ts`.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';
import { MarkArrow } from '@/components/public/marks';
import { PageHeader } from '@/components/public/page-header';
import { ProcessStepRow } from '@/components/public/process/process-step';
import { PROCESS_LEAD, PROCESS_STEPS } from '@/lib/process/steps';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { webPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';

const TITLE = 'How we handle your project';

export const metadata: Metadata = {
  title: TITLE,
  description: PROCESS_LEAD,
  alternates: { canonical: '/how-we-work' },
};

export default function HowWeWorkPage() {
  return (
    <article>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: TITLE }])} />
      <JsonLd
        id="page"
        data={webPageNode({
          path: '/how-we-work',
          name: TITLE,
          description: PROCESS_LEAD,
        })}
      />

      <PageHeader
        eyebrow="Working with Softmato"
        title={TITLE}
        lead={PROCESS_LEAD}
      />

      <StaggerIn as="ol" onScroll className="border-b border-border">
        {PROCESS_STEPS.map((step, index) => (
          <ProcessStepRow key={step.key} step={step} index={index} />
        ))}
      </StaggerIn>

      <Link
        href="/contact"
        className="link-arrow mt-12 text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span>Start a project</span>
        <MarkArrow className="size-5" />
      </Link>
    </article>
  );
}
