import type { Metadata } from 'next';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { CmsPage } from '@/components/public/cms-page';
import { ContactForm } from '@/components/public/contact-form';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('contact');
  return page ? metadataFor(page) : { title: 'Contact' };
}

export default function ContactPage() {
  return (
    <CmsPage slug="contact">
      <ContactForm />
    </CmsPage>
  );
}
