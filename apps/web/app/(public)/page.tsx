import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { splitLede } from '@/lib/markdown/lede';
import { homeTagline } from '@/lib/home/tagline';
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
 * The home page: a sequence of full-height stages, each built around one
 * light-form, on a single near-white ground.
 *
 * This replaces the alternating light/dark band stack. The reference the
 * founder supplied is one continuous space that the page moves through rather
 * than a set of panels laid end to end, and the thing that makes it read that
 * way is that the *ground never changes* — only what is lit on it does. Bands
 * with curved joins say "new section" at every boundary, which is the opposite.
 *
 * One exception: `ProductsSection` inverts to dark. See the note there — a
 * page of light needs a floor under it exactly once.
 *
 * The hero is the `home` page row (title and lede are founder-edited); every
 * section below reads its own content kind and returns null when that kind has
 * nothing published, which is why this reads as an unconditional list. The page
 * shortens on its own.
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
      <PrinciplesSection />
      <PlaceSection />
      <RecentPosts />
      <ClosingCta />
    </>
  );
}
