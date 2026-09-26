import type { ProviderId } from '@softmato/payment-core';

import type { ToneSentence } from './tone';

/**
 * Copy for the payments & integrations bento.
 *
 * Placeholder copy, written to become CMS fields like the rest of `lib/home/`.
 * What it may say is bounded the usual way (see `statements.ts`): the three
 * wallets, the receipt, the ledger entry and the signed webhook are all things
 * `payment-core` does today; the integrations card names services the founder
 * has said we connect products to. No counts, no clients, no prices.
 */

export const INTEGRATIONS_HEADING: ToneSentence = [
  { text: 'Plugged into' },
  { text: 'the tools your customers', tone: 'dim' },
  { text: 'already use.' },
];

export const BENTO_COPY = {
  wallets: {
    name: 'Take payment the way Nepal pays',
    description:
      'eSewa, Khalti and Fonepay at one checkout, built into your product rather than bolted beside it.',
    cta: 'Talk to us about payments',
    href: '/contact',
  },
  flow: {
    name: 'Wired into what you already run',
    description:
      'We integrate eSewa, Khalti and Fonepay into your website, your app or your own software, so customers pay without leaving it.',
    cta: 'Read the developer docs',
    href: '/developers',
  },
  activity: {
    name: 'Your app hears about it first',
    description:
      'A signed webhook for every payment and refund, the moment it settles.',
  },
  integrations: {
    name: 'AI and the apps people live in',
    description:
      'ChatGPT, Claude, Grok, Gemini, WhatsApp, Notion — we wire your product into the services around it.',
    cta: 'Start a project',
    href: '/contact',
  },
  hosting: {
    name: 'Hosted and looked after',
    description:
      'Servers, domains and certificates, set up at launch and watched after it.',
  },
} as const;

/*
 * The live feed. Amounts here are the drawn screen's own data, like the figure
 * on a drawn invoice — not a claim about volume. Event names are the real ones
 * the webhook sends. Every row happens inside the client's own product — the
 * card sells the integration, not Softmato's back office.
 */
export type ActivityItem =
  | { kind: 'payment'; wallet: ProviderId; amount: string; where: string }
  | {
      kind: 'order' | 'notify' | 'webhook' | 'refund';
      title: string;
      detail: string;
    };

export const ACTIVITY: ActivityItem[] = [
  {
    kind: 'payment',
    wallet: 'esewa',
    amount: 'NPR 2,400',
    where: 'Paid on your website',
  },
  {
    kind: 'webhook',
    title: 'Webhook delivered',
    detail: 'payment.success · 200',
  },
  { kind: 'order', title: 'Order marked paid', detail: 'In your admin' },
  {
    kind: 'payment',
    wallet: 'khalti',
    amount: 'NPR 850',
    where: 'Paid in your app',
  },
  {
    kind: 'notify',
    title: 'Customer notified',
    detail: 'Confirmation in your app',
  },
  {
    kind: 'payment',
    wallet: 'fonepay',
    amount: 'NPR 12,000',
    where: 'Paid in your software',
  },
  {
    kind: 'refund',
    title: 'Refund sent back',
    detail: 'payment.refunded · 200',
  },
];

/** Kathmandu, from `place.ts`, as numbers. */
export const GLOBE_MARKERS = [
  { location: [27.7172, 85.324] as [number, number], size: 0.08 },
];
