import { z } from 'zod';

/**
 * What the SaaS is selling, in its own words.
 *
 * Softmato knows an invoice has a line called "HostelHub — Annual Plan" for
 * NPR 20,000. It does not know that the plan includes 500 beds, nightly
 * backups and onboarding, because that is the SaaS's product and not ours.
 * This is the channel for that: the integrator sends it when raising the
 * invoice, and we render it — on the checkout page beside the amount, and on
 * the invoice under the line items.
 *
 * **It is presentation, never arithmetic.** Nothing here can change what is
 * owed. The amount comes from the invoice lines and the ledger; these are
 * words next to it. That separation is why this can be accepted from an
 * integrator at all — the worst a wrong value can do is describe the plan
 * badly, not misprice it.
 *
 * Stored in `invoices.metadata.presentation`, which is an existing `jsonb`
 * column, so this costs no migration. It is versioned because it is rendered
 * on a customer-facing document: when the shape changes, an invoice raised
 * last year still has to render the way it rendered then.
 *
 * ## Rules for an integrator
 *
 * Every one of these is enforced by `presentationSchema`, and a request that
 * breaks one is rejected with a message naming the field — a document is not
 * the place to discover that a bullet was 4,000 characters long.
 *
 *   1. **Plain text only.** No HTML, no Markdown. It is escaped on render, so
 *      a tag arrives as literal `<b>` and looks like a mistake.
 *   2. **At most 8 features**, 120 characters each. A checkout page that
 *      scrolls is a checkout page people abandon; a list longer than this is
 *      a landing page, and it belongs on the SaaS's own site.
 *   3. **At most 3 highlights**, 60 characters each. They are set apart
 *      visually, so a fourth is not emphasis any more.
 *   4. **No prices, in any field.** The amount is stated once, by us, from the
 *      ledger. A bullet reading "Only NPR 15,000!" beside a charge of NPR
 *      20,000 is a dispute, and the customer would be right. This one is
 *      actively checked rather than merely asked for.
 *   5. **No claims about payment, refunds or Softmato.** The refund policy is
 *      ours and is linked from the page; a plan bullet promising a different
 *      one creates an obligation the SaaS cannot settle on our behalf.
 *      Not machine-checkable — it is in the integration contract.
 *   6. **It may be omitted entirely.** A missing block renders nothing at all.
 *      There is no default, no placeholder and no "Standard plan" invented on
 *      the integrator's behalf.
 */

/** Bumped when the rendered shape changes in a way old invoices must not follow. */
export const PRESENTATION_VERSION = 1;

export const MAX_FEATURES = 8;
export const MAX_HIGHLIGHTS = 3;

/**
 * Rule 4, enforced.
 *
 * Catches `NPR 5000`, `Rs. 5,000`, `रू ५०००` and a bare `5,000/-`. It is
 * deliberately eager: a false positive costs an integrator one edit and a
 * clear error message, while a false negative costs a customer an argument
 * about what they were charged.
 */
const PRICE_LIKE =
  /(\bNPR\b|\bRs\.?\b|रू|₨|\/-\s*$|\b\d{1,3}(,\d{2,3})+(\.\d+)?\b)/i;

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/[<>]/.test(value), {
      message: 'Plain text only — no HTML tags.',
    });

const sellingPoint = (max: number) =>
  plainText(max).refine((value) => !PRICE_LIKE.test(value), {
    message:
      'No prices here. The amount is stated once, by Softmato, from the ' +
      'invoice — a figure in a feature line that disagrees with it becomes a ' +
      'billing dispute.',
  });

export const presentationSchema = z.object({
  /** The plan's own name, e.g. `Growth — Annual`. */
  plan_name: plainText(80),
  /** One line under the name. Not a paragraph. */
  tagline: plainText(140).optional(),
  /** The bullet list. */
  features: z.array(sellingPoint(120)).max(MAX_FEATURES).optional(),
  /** Set apart from the bullets — "Priority support", "Free onboarding". */
  highlights: z.array(sellingPoint(60)).max(MAX_HIGHLIGHTS).optional(),
  /**
   * What the plan covers, in the integrator's words — `12 months`,
   * `until 2027-08-24`. Free text because billing periods are not ours to
   * model; the invoice's own service window remains the authoritative dates.
   */
  billing_period: plainText(60).optional(),
});

export type PresentationInput = z.infer<typeof presentationSchema>;

/** The stored shape: the validated input plus the version it was written at. */
export interface Presentation extends PresentationInput {
  version: number;
}

export function toStoredPresentation(input: PresentationInput): Presentation {
  return { ...input, version: PRESENTATION_VERSION };
}

/**
 * Reads it back for rendering, and refuses anything it does not recognise.
 *
 * **Re-validated on the way out, not trusted because it was validated on the
 * way in.** The rules can tighten, the column can be written to by a future
 * admin tool, and this ends up on a customer-facing document — so the renderer
 * checks rather than assumes. Invalid content renders as nothing, which is the
 * same as never having sent any: a degraded page, not a broken one, and never
 * a page carrying whatever happened to be in the column.
 */
export function readPresentation(
  metadata: Record<string, unknown> | null | undefined,
): Presentation | null {
  const raw = metadata?.['presentation'];

  if (!raw || typeof raw !== 'object') return null;

  const parsed = presentationSchema.safeParse(raw);

  if (!parsed.success) return null;

  const version = (raw as { version?: unknown }).version;

  return {
    ...parsed.data,
    version: typeof version === 'number' ? version : PRESENTATION_VERSION,
  };
}
