import type { EmailCategory } from './categories';

/**
 * A rendered email, ready to hand to the provider.
 *
 * Templates return this shape and nothing else — they never touch the network,
 * so they stay pure and testable, and the provider stays swappable in one file
 * (`send.ts`) rather than in every template.
 */
export interface EmailTemplate {
  /**
   * Which mailbox this goes out from — `billing@`, `alert@`, and so on.
   *
   * It lives on the template rather than on the call site because the category
   * is a property of the *message*, and the call site is the one place that
   * cannot see the whole message. Code reaching for `paymentReceiptEmail()`
   * should not also have to remember that a receipt is billing mail; handing
   * the template to `sendEmail()` carries the answer along with it.
   */
  category: EmailCategory;
  subject: string;
  html: string;
  /** Always present. A text part is what keeps the mail out of spam filters. */
  text: string;
}
