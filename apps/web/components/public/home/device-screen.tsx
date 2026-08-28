import { CmsImage } from '@/components/public/cms-image';

/**
 * A product inside a device frame.
 *
 * **The empty state is the one designed first.** No screenshot has been
 * uploaded for either product, so the frame that reads as finished with
 * nothing in it is the normal case and the photographed one is the exception.
 * An empty frame here is a lit screen carrying the product's name — a real CMS
 * field — rather than a grey box with a camera icon in it, and it fills in on
 * its own the moment `screenshotUrl` is set in the panel.
 *
 * The name and nothing else. The caller sets the name and the tagline again
 * directly underneath as the frame's caption, and a tagline printed twice,
 * eighty pixels apart, reads as a bug rather than as emphasis.
 *
 * The 16:9 ratio is fixed on the frame, not on the image. A screenshot cropped
 * to fit is a screenshot you can no longer read, which defeats the point of
 * showing one.
 */
export function DeviceScreen({
  title,
  screenshotUrl,
}: {
  title: string;
  screenshotUrl?: string | null;
}) {
  return (
    <div className="device">
      <div className="device-screen aspect-video">
        {screenshotUrl ? (
          <CmsImage
            src={screenshotUrl}
            alt={`${title} interface`}
            width={1280}
            height={720}
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="size-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid size-full place-items-center p-6"
          >
            <p className="display text-[clamp(1.5rem,3.4vw,2.4rem)] uppercase tracking-[0.22em] text-white/70">
              {title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
