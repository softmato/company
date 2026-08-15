/**
 * A rendered email, ready to hand to the provider.
 *
 * Templates return this shape and nothing else — they never touch the network,
 * so they stay pure and testable, and the provider stays swappable in one file
 * (`send.ts`) rather than in every template.
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  /** Always present. A text part is what keeps the mail out of spam filters. */
  text: string;
}
