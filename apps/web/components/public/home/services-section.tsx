import { listPublishedServices } from '@/lib/cms/public-queries';

import { ServicesChapter } from './services-chapter';

/**
 * The services chapter's data half.
 *
 * `ServicesChapter` tracks which step the reader is level with, which makes it
 * a client component, and a client component cannot be `async`. So the query
 * lives here and the rows are handed down — one server file whose whole job is
 * the query, rather than a `use()` and a suspense boundary around three rows
 * that were already on the server.
 *
 * Returns null when nothing is published: an empty "What we take on" heading
 * over a panel with nothing beside it is worse than a shorter page.
 */
export async function ServicesSection() {
  const services = await listPublishedServices();

  if (services.length === 0) return null;

  return (
    <ServicesChapter
      services={services.map((service) => ({
        id: service.id,
        slug: service.slug,
        title: service.title,
        summary: service.summary,
      }))}
    />
  );
}
