import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

/**
 * The terms a team integrating the payment API is issued credentials under.
 *
 * **The technical clauses here are descriptions, not promises.** Every one of
 * them is enforced by code: the registered-domain rule by
 * `assertRegisteredHost`, signature verification by the delivery signer, the
 * rotation overlap by `rotateSecret`. Writing down what the system already does
 * is safe. Writing down what it might do is how a policy becomes a liability.
 *
 * The commercial half — liability, indemnity, termination, governing law — is
 * deliberately a `[confirm: …]` block. It is not ours to invent, it needs a
 * lawyer, and until it is filled in `legalReadiness()` keeps the page out of
 * search engines and `pnpm legal:check` blocks the deploy that would publish
 * it. That is the guard working, not a bug to route around.
 */
export const partnerTerms: LegalDocumentSeed = {
  slug: 'partner-terms',
  title: 'Integration Terms',
  body: body(
    `These terms apply to a team that has been issued credentials for the
Softmato payment API. They sit alongside the technical documentation at
[/developers](/developers), which describes the same rules in the form you will
meet them as an engineer.

Nothing here replaces the agreement under which the product itself is built or
operated. It covers the API, the credentials, and the money that moves through
them.`,

    `## 1. Credentials

Credentials are issued **per application**, not per company and not per person.
An application identifies one product in one environment — live or sandbox —
and its credentials are not shared between products, environments, or
organisations, and are not sub-licensed.

Two separate secrets are issued, and they are not interchangeable:

- the **client secret** authenticates your requests to us. It is stored here
  only as a hash, so it cannot be read back to you. A lost one is rotated.
- the **webhook signing secret** authenticates our deliveries to you. It is the
  value your endpoint verifies against.

The client secret is used **server-side only**. It must not be placed in a
browser bundle, a mobile application, a repository, a log, or a URL. Anything
distributed to a device is public regardless of how it is named.

Rotating a client secret keeps the superseded one working for **24 hours** so
you can deploy without an outage. Rotating a webhook signing secret takes effect
immediately and has no overlap. Revocation is immediate.`,

    `## 2. Registered addresses

An application may send customers only to, and receive webhooks only on,
hostnames registered against it **in advance**.

- The list is maintained by us. It is never taken from a request, because an
  allowlist a caller can add to is not an allowlist.
- Matching is exact. A subdomain is a different host and needs its own entry.
  There are no wildcards.
- A \`return_url\` or webhook address on an unregistered host is **refused**,
  with the rejected hostname named in the response.

Tell us every hostname before you need it. Adding one is a request to us;
until it is added, requests naming it will fail.`,

    `## 3. Acting on a payment

Provision the customer's service when a \`payment.success\` webhook has been
**verified**, or when a transaction you fetched from us reports success.

Do not provision on:

- an invoice existing — an invoice is a request for money, not money;
- a customer arriving at your return URL, which they reach by clicking;
- any parameter on that URL. We put no payment status there.

Verify the webhook signature **before reading any field of the body**. An
unverified body is a string a stranger chose.`,

    `## 4. What is on an invoice

The contents of an invoice must match what the customer actually bought.

The \`presentation\` block is yours — your plan name, your description, your
wording. It may not contradict the amount, the currency, or the line items,
and it may not add charges, conditions, or terms that are not in the invoice
itself. It describes the sale; it does not alter it.

Invoices are issued in Softmato's name and against Softmato's PAN. The
numbering, the ledger entries, the receipt and the PDF are ours to produce, and
are the authoritative record of the transaction.`,

    `## 5. Refunds and disputes

Refunds are requested through the API and **approved by Softmato**. A refund
settled directly with a customer outside this process is not recorded against
the invoice, does not appear in either party's books, and does not reverse the
original payment.

Where a customer disputes a payment with their provider or their bank, the
dispute is handled by us, because the merchant account it was taken through is
ours. Tell us as soon as you hear of one.`,

    `## 6. Our responses

You may retain the data our API returns for as long as you need it to run your
product and meet your own record-keeping obligations.

You may not use it to build a profile of a person beyond that purpose, sell it,
or pass it to a third party who is not processing it on your behalf. Where the
data identifies a person, our Privacy Policy and the Individual Privacy Act,
2075 apply to it in your hands as they do in ours.`,

    `## 7. Suspension

Credentials may be suspended or revoked where:

- a secret has been exposed, or we have reason to believe it has;
- traffic threatens the availability of the platform for others;
- payments are being taken for something other than what the invoice describes;
- an invoice for our own services is materially overdue.

Where the reason is exposure or an active threat to the platform, suspension is
**immediate and without notice** — the alternative is leaving a known-open door
open out of politeness. In every other case we will give notice and a chance to
put it right first.

[confirm: how much notice, and to whom it is given]`,

    `## 8. Commercial terms

[confirm: liability cap, indemnity, term and termination, governing law and
jurisdiction, fees and revenue share if any. This block is deliberately empty.
It needs a lawyer, and until it is filled in this document is not published and
is not indexed by search engines.]`,

    `## 9. Changes and contact

These terms are versioned, and the version that applied on any past date
remains available. Where we tighten a technical rule in a way that could break
a working integration, we will say so before it takes effect.

The engineering detail behind every clause above is at
[/developers](/developers).

${CONTACT_BLOCK}`,
  ),
};
