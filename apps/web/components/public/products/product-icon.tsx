import { cn } from '@/lib/cn';
import { CmsImage } from '@/components/public/cms-image';

/**
 * A product's app icon on a white squircle, the way it sits on a phone's home
 * screen. Decorative — the product's name is always printed beside it.
 */
export function ProductIcon({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-[26%] border border-border bg-white shadow-float',
        className,
      )}
    >
      {src ? (
        <CmsImage
          src={src}
          alt=""
          width={512}
          height={512}
          sizes="128px"
          className="size-[74%] object-contain"
        />
      ) : (
        <span className="headline text-[2em] text-neutral-900">{name[0]}</span>
      )}
    </span>
  );
}

/** `https://hostelpalika.com/` → `hostelpalika.com`, for link labels. */
export const siteHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
