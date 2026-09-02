import type { Settings } from '@/lib/settings/registry';

import type { Party } from './types';

/**
 * Who Softmato is, on a document.
 *
 * Derived from `platform_settings`, never hardcoded. The founder can
 * change the registered address in the admin panel without a deploy, and an
 * address baked into a template is one that goes stale silently.
 *
 * **Blank fields stay blank.** `company.pan`, `company.address` and
 * `company.phone` all default to the empty string and are empty in the
 * database today. The billing spec calls the seller PAN mandatory on every
 * invoice, and it is — but the resolution to a missing PAN is *to go and enter
 * it*, not to print a number that belongs to nobody. `missingSellerFields()`
 * exists so the admin surface can say so loudly instead.
 */
/**
 * The mapping, taking settings that have already been read.
 *
 * **Pure, and this module carries no `server-only` marker**, which is what
 * makes the seller reachable from the places that cannot import one:
 * `scripts/demo-checkout.mts` issues real invoices against a real database and
 * has to freeze the same seller onto them. Two spellings of who the company is
 * on two invoices in the same table is the kind of difference nobody finds
 * until an auditor does.
 *
 * The read itself is one import away, in `seller-query.ts`.
 */
export function sellerFromSettings(settings: Settings): Party {
  return {
    name: settings.text('company.legal_name'),
    address: blankAsNull(settings.text('company.address')),
    pan: blankAsNull(settings.text('company.pan')),
    /*
     * Falls back to support, because a document with no address for a query
     * about it is worse than one quoting the wrong inbox. Both are blank
     * today; the banner says so.
     */
    email:
      blankAsNull(settings.text('company.contact_email')) ??
      blankAsNull(settings.text('company.support_email')),
    phone: blankAsNull(settings.text('company.phone')),
  };
}

/**
 * The fields a compliant invoice needs and does not have yet.
 *
 * Returned rather than thrown. Refusing to render would hide the invoice from
 * the person who can fix it, and the fix is four values in a settings form —
 * so the document renders with the gaps visible and this drives the banner
 * that names them.
 */
export function missingSellerFields(seller: Party): string[] {
  const missing: string[] = [];

  // Spec §5: "Seller PAN — mandatory, always visible in the header."
  if (!seller.pan) missing.push('PAN (company.pan)');
  if (!seller.address) missing.push('Registered address (company.address)');
  if (!seller.email) missing.push('Contact email (company.contact_email)');
  if (!seller.phone) missing.push('Phone (company.phone)');

  return missing;
}

function blankAsNull(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
