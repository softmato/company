import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/cms/public-queries';
import { SITE_TITLE, siteUrl } from '@/lib/seo/site';
import { metadataFor } from '@/lib/cms/metadata';
import { JsonLd } from '@/lib/seo/json-ld';
import { siteGraph } from '@/lib/seo/organization';
import { splitLede } from '@/lib/markdown/lede';
import { homeTagline } from '@/lib/home/tagline';
import { Hero } from '@/components/public/home/hero';
import { PaymentsSection } from '@/components/public/home/payments-section';
import { PlaceSection } from '@/components/public/home/place-section';
import { PreviewSection } from '@/components/public/home/preview-section';
import { PrinciplesSection } from '@/components/public/home/principles-section';
import { RecentPosts } from '@/components/public/home/recent-posts';
import { ServicesSection } from '@/components/public/home/services-section';
import { Statement } from '@/components/public/home/statement';
import { TrustedSection } from '@/components/public/home/trusted-section';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('home');

  /*
   * `title: { absolute }` so the root layout's "%s · Softmato" template does
   * not run on the one page whose title already is the company name.
   */
  const base = page
    ? metadataFor(page, { path: '/' })
    : { title: SITE_TITLE, alternates: { canonical: siteUrl('/') } };

  return { ...base, title: { absolute: page?.metaTitle ?? SITE_TITLE } };
}

/**
 * The home page: the chapters under the dark hero, each a different shape, on
 * one near-white ground.
 *
 * **Every section is a different shape, and that is the rule the page is built
 * on.** This is the portfolio for a company that sells websites; a repeating
 * card grid down the page reads as one work sample shown seven times, however
 * well the cards are made. So: a sentence over a scatter of discs, then a
 * browser window open on a client's live preview, then a panel
 * held still while copy scrolls past it, then payments, then a route diagram,
 * then a photograph beside a globe, then a plain list, then a wall of names
 * that closes the page. Each shape is used once.
 *
 * The hero is the `home` page row (title and lede are founder-edited). Every
 * section below reads its own content kind and returns null when that kind has
 * nothing published, which is why this reads as an unconditional list: the page
 * shortens on its own.
 *
 * Section copy that is not in the CMS yet lives in `lib/home/`, written to
 * become admin-editable fields the same way services, products, team and posts
 * already are.
 */
export default async function HomePage() {
  const page = await getPage('home');

  if (!page) notFound();

  const { lede } = splitLede(page.body);

  return (
    <>
      {/*
        The home page is the only page that carries the Organization and
        WebSite blocks. Everything else points at them by `@id` — repeating
        them per page does not make the company more credible to a crawler, it
        just creates more copies that can disagree with each other.
      */}
      <JsonLd id="site-graph" data={await siteGraph()} />

      <Hero tagline={homeTagline(page.title, page.metaTitle)} lede={lede} />
      <Statement />
      <PreviewSection />
      <ServicesSection />
      <PaymentsSection />
      <PrinciplesSection />
      <PlaceSection />
      <RecentPosts />
      <TrustedSection />
    </>
  );
}
