import Link from 'next/link';

import { BlurIn } from '@/components/motion/blur-in';
import { LightForm } from '@/components/three/light-form';
import { listPublishedServices } from '@/lib/cms/public-queries';

/**
 * The orb section — the reference's "Data Protection" frame: a heading sitting
 * over a lit body, with the detail cards below it.
 *
 * Every service is a published CMS row, so this section's length is whatever
 * the founder has published. It returns null when that is nothing: an empty
 * "Services" heading over three empty cards is worse than a shorter page.
 *
 * The index numbers are ordinals, not counts. They exist because the services
 * have no icons — `icon` is an optional field and nothing has filled it — and
 * a card needs something at its top left to hang the eye on.
 */
export async function ServicesSection() {
  const services = await listPublishedServices();

  if (services.length === 0) return null;

  return (
    <section className="stage px-6 py-28 sm:py-36">
      <div
        className="bloom"
        style={{ '--bloom-x': '50%', '--bloom-y': '22%' } as React.CSSProperties}
      />
      <LightForm kind="orb" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-[34ch] pt-24 text-center sm:pt-40">
          <BlurIn as="h2" className="headline text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]">
            What we take on
          </BlurIn>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
            Product work we run ourselves, and project work we hand over with
            the source and the documents.
          </p>
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <li key={service.id}>
              <Link
                href={`/services/${service.slug}`}
                className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <article className="section-frame flex h-full flex-col p-6 transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-float">
                  <span className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <h3 className="headline mt-6 text-[20px]">{service.title}</h3>

                  {service.summary ? (
                    <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                      {service.summary}
                    </p>
                  ) : null}

                  <span className="mt-auto pt-8 text-[13px] font-medium text-primary">
                    Read more
                  </span>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
