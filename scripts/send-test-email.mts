/**
 * Sends one real email, to prove the sending path actually reaches an inbox.
 *
 * Everything about the sender is assembled by the same pure functions the app
 * uses (`fromHeaderFor` / `replyToFor`), so a green run here is evidence about
 * the real configuration and not about a mock. What it deliberately does not
 * touch is `lib/email/send.ts`: that module is `server-only` and reads the
 * settings table, neither of which exists in a plain script. The identity it
 * builds is therefore the *shipped* one — env domain, default mailboxes,
 * default sender name — which is exactly what the app sends as while the Email
 * settings group is still blank.
 *
 *   pnpm tsx --env-file-if-exists=.env.local ./scripts/send-test-email.mts <to>
 *
 * Talks to the Resend REST API with `fetch` rather than the SDK so the script
 * has no dependency of its own to resolve.
 */
import { DEFAULT_MAILBOXES } from '../apps/web/lib/email/categories.ts';
import {
  fromHeaderFor,
  replyToFor,
  SHIPPED_EMAIL_DOMAIN,
  SHIPPED_SENDER_NAME,
  type EmailIdentity,
} from '../apps/web/lib/email/identity.ts';
import { layout, paragraph } from '../apps/web/lib/email/html.ts';

const to = process.argv[2];

if (!to) {
  console.error('Usage: send-test-email.mts <recipient>');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('RESEND_API_KEY is not set. Nothing sent.');
  process.exit(1);
}

const identity: EmailIdentity = {
  domain: process.env.EMAIL_DOMAIN?.trim() || SHIPPED_EMAIL_DOMAIN,
  mailboxes: { ...DEFAULT_MAILBOXES },
  replyTo: process.env.EMAIL_REPLY_TO?.trim() ?? '',
  senderName: SHIPPED_SENDER_NAME,
};

const category = 'info' as const;
const from = fromHeaderFor(category, identity);
const replyTo = replyToFor(category, identity);

if (!from) {
  console.error('No sending domain configured. Nothing sent.');
  process.exit(1);
}

const subject = 'Email delivery test';

const body = [
  paragraph(
    'This is a test of the Softmato sending path. If it is sitting in your ' +
      'inbox, the domain is verified in Resend and the category routing works.',
  ),
  paragraph(
    'It was sent as the "info" category, so it comes from the info mailbox ' +
      'and carries a reply address. Replying to it is the second half of the ' +
      'test: the reply has to reach the forwarding alias to prove inbound ' +
      'works, which sending alone can never show.',
  ),
].join('');

const html = layout({
  eyebrow: 'System test',
  heading: 'Sending path check',
  rows: [
    { label: 'Category', value: category },
    { label: 'From', value: from },
    { label: 'Reply-to', value: replyTo || '(none)' },
    { label: 'Sent', value: new Date().toISOString() },
  ],
  body,
  footer: 'Softmato Technology Pvt Ltd — automated test, no action needed.',
});

const text = [
  'This is a test of the Softmato sending path.',
  '',
  `Category:  ${category}`,
  `From:      ${from}`,
  `Reply-to:  ${replyTo || '(none)'}`,
  `Sent:      ${new Date().toISOString()}`,
  '',
  'Replying to it proves the inbound alias works, which sending alone cannot.',
].join('\n');

console.log(`from     ${from}`);
console.log(`to       ${to}`);
console.log(`reply-to ${replyTo || '(none)'}`);
console.log(`subject  ${subject}`);

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject,
    html,
    text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  }),
});

const payload = await response.text();

if (!response.ok) {
  console.error(`\nFAILED — Resend returned ${response.status}`);
  console.error(payload);
  process.exit(1);
}

console.log(`\nsent — ${payload}`);
