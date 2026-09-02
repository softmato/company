import type { InvoiceDocument, ReceiptDocument } from './types';
import { missingSellerFields } from './seller';

/**
 * What is wrong or provisional about this rendered document, in plain words.
 *
 * Shown on the admin screen and never on the customer's copy. The split is the
 * whole design: the person who can fix a missing PAN is the one looking at
 * `/admin`, and the person holding the printed invoice can do nothing about it
 * but lose confidence in the document.
 *
 * Pure, so both surfaces and the tests agree on what counts as a problem.
 */
export function documentIssues(
  document: InvoiceDocument | ReceiptDocument,
): string[] {
  const issues: string[] = [];

  for (const field of missingSellerFields(document.seller)) {
    issues.push(
      `Company ${field} is not set. It is required on a Nepali PAN bill — ` +
        'set it in Settings → Company.',
    );
  }

  if (document.renderedFromLiveParties) {
    issues.push(
      'Rendered from live customer and company details, not from a snapshot ' +
        'frozen when the document was issued. If either has changed since, ' +
        'this is not byte-for-byte the document that was sent.',
    );
  }

  if (document.kind === 'invoice') {
    if (document.lines.length === 0) {
      issues.push(
        'This invoice has no line items — it does not say what was sold.',
      );
    }

    if (document.issuedAt === null) {
      issues.push('No issue date: this invoice is still a draft.');
    }
  }

  return issues;
}
