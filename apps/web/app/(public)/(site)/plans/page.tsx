/**
 * `/plans` — static, advanced and custom, each covering websites and apps,
 * then what we look after once it is live. A pricing page with the figures
 * left out: scope decides the price.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers } from 'lucide-react';

import { MarkArrow } from '@/components/public/marks';
import { PageIntro } from '@/components/public/page-intro';
import { PlanCare } from '@/components/public/plans/plan-care';
import { PlanFaq } from '@/components/public/plans/plan-faq';
import { PlanGrid } from '@/components/public/plans/plan-grid';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { webPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';

const TITLE = 'Plans';
const LEAD =
  'Every plan covers websites and mobile apps. Pick the one that fits, and we quote once we have talked it through.';
const DESCRIPTION =
  'Static, advanced and custom plans for websites and mobile apps from Softmato, a software company in Nepal. Every project is priced on a written scope.';

export const metadata: Metadata = {
  title: 'Plans for websites and apps',
  description: DESCRIPTION,
  alternates: { canonical: '/plans' },
};

export default function PlansPage() {
  return (
    <article>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: TITLE }])} />
      <JsonLd
        id="page"
        data={webPageNode({
          path: '/plans',
          name: 'Plans for websites and apps',
          description: DESCRIPTION,
        })}
      />

      <PageIntro icon={Layers} eyebrow="Plans" title={TITLE} lead={LEAD} />
      <PlanGrid />
      <PlanCare />
      <PlanFaq />

      <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-4">
        <Link
          href="/contact"
          className="link-arrow text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>Not sure which one? Tell us what it has to do</span>
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
