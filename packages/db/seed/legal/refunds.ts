import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const refunds: LegalDocumentSeed = {
  slug: 'refunds',
  title: 'Refund & Cancellation Policy',
  body: body(
    `This policy explains when money comes back, how long it takes, and what to
send us so it can. It is written alongside the rights you have under the
**Consumer Protection Act, 2075 (2018)**, which this policy does not reduce.`,

    `## 1. Payments that failed or went wrong

These are refunded in full, and no reason needs to be given:

- **You were charged twice for the same thing.** We refund the duplicate.
- **Money left your account but the service was never activated.** If our
  records and the provider's disagree, the provider's record decides, and we
  correct our side.
- **You were charged the wrong amount.** We refund the difference.

Tell us within **30 days** of the payment, with the
details in section 5. A payment that a provider reports as failed but which has
debited your wallet or bank is usually reversed by the provider itself within
their own timeline; tell us anyway and we will chase it with them.`,

    `## 2. Subscriptions

Nothing renews automatically — every payment is one you make yourself — so a
subscription cannot charge you by surprise. To stop it, simply do not pay the
renewal, or tell us to cancel.

- **New subscription:** if you tell us within
  **7 days** of your first payment that the product is not
  right for you, we refund it in full.
- **After that period:** the paid term runs to its end and is not refunded
  part-way. You keep access until the term expires.
- **If we fail:** where a hosted product misses the commitments in our Service
  Level Agreement, the remedy is the service credit described there.
- **If we withdraw a product:** we refund the unused part of the term, counted
  in whole days.`,

    `## 3. Project work

Project work is quoted and invoiced against a written proposal, usually in
stages.

- The **advance** confirms the booking and covers work that begins immediately.
  It is not refundable once work has started.
- A **stage** already delivered and accepted is not refundable.
- If you cancel mid-stage, we invoice the work done up to that point and refund
  the balance held.
- If we cannot deliver, we refund everything paid for work not yet delivered.

Amounts paid to third parties on your behalf — domains, licences, hosting,
advertising — cannot be refunded once bought, because we cannot recover them
either. Those remain yours.`,

    `## 4. What is not refunded

- Setup and one-time onboarding fees, once the work is done. Within the
  7-day window above they are refunded along with the subscription.
- Work delivered and accepted.
- Government taxes already paid on your behalf, where the authority does not
  refund them to us.
- Amounts more than **6 months** old, unless the law requires
  otherwise.`,

    `## 5. How to ask for a refund

Email **[confirm: refunds email]** with:

1. the transaction reference from the payment (eSewa, Khalti, Fonepay, or the
   bank reference on a QR transfer);
2. the date and amount;
3. the invoice number, if you have it;
4. what went wrong.

We acknowledge within **2 working days** and decide within **7 working
days**.`,

    `## 6. How the money comes back

Refunds go back **the way they came**: a wallet payment returns to the same
wallet, a card payment to the same card, a bank transfer to the account it came
from. We cannot send a refund to a different account, because that is how
refund fraud works.

Once approved, we release the refund within **7 working days**. How long it then takes to appear is the
provider's and the bank's to decide — typically a few days for a wallet, longer
for a card or an inter-bank transfer.

Bank charges deducted by an intermediary bank on an international transfer are
not ours to refund.`,

    `## 7. If you disagree with our decision

Write to us first — most disputes are a missing reference. If we cannot agree,
you keep every right you have under the Consumer Protection Act, 2075,
including complaint to the relevant authority, and you may raise a dispute with
your payment provider or bank directly.`,

    `## 8. Contact

${CONTACT_BLOCK}`,
  ),
};
