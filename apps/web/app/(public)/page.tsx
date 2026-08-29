import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { splitLede } from '@/lib/markdown/lede';
import { homeTagline } from '@/lib/home/tagline';
import { BuildTiers } from '@/components/public/home/build-tiers';
import { ClosingCta } from '@/components/public/home/closing-cta';
import { Hero } from '@/components/public/home/hero';
import { PlaceSection } from '@/components/public/home/place-section';
import { PrinciplesSection } from '@/components/public/home/principles-section';
import { ProductsSection } from '@/components/public/home/products-section';
import { RecentPosts } from '@/components/public/home/recent-posts';
import { ServicesSection } from '@/components/public/home/services-section';
import { Statement } from '@/components/public/home/statement';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('home');
  return page ? metadataFor(page) : { title: 'Home' };
}

/**
 * The home page: eight chapters under the hero, each a different shape, on one
 * near-white ground with two bands of night in it.
 *
 * **Every section is a different shape, and that is the rule the page is built
 * on.** This is the portfolio for a company that sells websites; a repeating
 * card grid down the page reads as one work sample shown eight times, however
 * well the cards are made. So: a sentence over a scatter of discs, then a panel
 * held still while copy scrolls past it, then a dark band of product surfaces,
 * then a ruled ladder, then a heap of words dropped under gravity, then a
 * photograph beside a globe, then a plain list, then the close. Each shape is
 * used once.
 *
 * **Two dark bands, not one.** The earlier build allowed exactly one, because a
 * dark section butted against a light one on a straight edge reads as a stripe
 * and two stripes read as a pattern. The second reference film solves it a
 * different way — every dark panel has a large top radius and slides up over
 * the light behind it, so it reads as a chapter rather than a band — and with
 * that join the page can open on night, spend its middle in the light, and
 * close on the ground it started from. See `.band-dark` in marketing.css.
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
      <Hero tagline={homeTagline(page.title, page.metaTitle)} lede={lede} />
      <Statement />
      <ServicesSection />
      <ProductsSection />
      <BuildTiers />
      <PrinciplesSection />
      <PlaceSection />
      <RecentPosts />
      <ClosingCta />
    </>
  );
}
