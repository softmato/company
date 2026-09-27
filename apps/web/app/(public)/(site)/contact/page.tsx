import type { Metadata } from 'next';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { contactPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CmsPage } from '@/components/public/cms-page';
import { ContactDetails } from '@/components/public/contact-details';
import { ContactForm } from '@/components/public/contact-form';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('contact');
  return page ? metadataFor(page, { path: '/contact' }) : { title: 'Contact' };
}

export default async function ContactPage() {
  const page = await getPage('contact');

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Contact' }])} />
      <JsonLd id="page" data={contactPageNode(page?.metaDescription)} />

      <CmsPage slug="contact">
        {/*
        The form leads and the details follow it in source order, so a screen
        reader and a narrow viewport both meet the thing being asked for
        first. On desktop the grid puts them side by side.
      */}
        <div className="grid items-start gap-x-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
          <ContactForm />
          <ContactDetails />
        </div>
      </CmsPage>
    </>
  );
}
