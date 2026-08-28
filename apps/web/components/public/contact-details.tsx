import { getSettings } from '@/lib/settings/queries';
import { Card } from '@/components/ui/card';

/**
 * Office, phone and email, beside the form (docs/UI_BRIEF.md §3.1).
 *
 * All of it comes from platform settings, and all of it defaults to empty —
 * a founder fills these in at /admin/settings. Each block is conditional so
 * the panel shrinks to what has been filled in rather than printing labels
 * over blanks, and the whole panel disappears if none of it is set.
 */
export async function ContactDetails() {
  const settings = await getSettings();

  const address = settings.text('company.address');
  const phone = settings.text('company.phone');
  const email = settings.text('company.support_email');

  if (!address && !phone && !email) return null;

  return (
    <Card className="mt-8 h-fit px-5 py-5">
      {address ? (
        <div>
          <p className="eyebrow">Office</p>
          <p className="mt-1.5 text-sm">{address}</p>
        </div>
      ) : null}

      {phone ? (
        <div className={address ? 'mt-5' : undefined}>
          <p className="eyebrow">Phone</p>
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="numeric mt-1.5 inline-block text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {phone}
          </a>
        </div>
      ) : null}

      {email ? (
        <div className={address || phone ? 'mt-5' : undefined}>
          <p className="eyebrow">Email</p>
          <a
            href={`mailto:${email}`}
            className="mt-1.5 inline-block text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {email}
          </a>
        </div>
      ) : null}
    </Card>
  );
}
