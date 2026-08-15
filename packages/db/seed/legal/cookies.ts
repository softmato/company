import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const cookies: LegalDocumentSeed = {
  slug: 'cookies',
  title: 'Cookie Policy',
  body: body(
    `A cookie is a small file a website stores in your browser. We use very few,
and none of them follow you to other websites.`,

    `## 1. What we set

| Cookie | Purpose | Lasts |
| --- | --- | --- |
| \`authjs.session-token\` | Keeps you signed in after you log in | Session, or 30 days if you stay signed in |
| \`authjs.csrf-token\` | Protects sign-in and forms against cross-site request forgery | Session |
| \`authjs.callback-url\` | Returns you to the right page after signing in | Session |

All three are **strictly necessary**: the admin panel and client portal cannot
work without them, so they are set when you sign in rather than asked about.
The public marketing pages set no cookies at all — you can read the whole site
without one.

Cookie names come from the authentication library we use and may change when it
is updated; the purposes will not.`,

    `## 2. What we do not do

- **No advertising or tracking cookies.** We do not run ad networks, retargeting
  pixels, or social media trackers.
- **No cross-site profiling.** Nothing we set is readable by another website.
- **No analytics cookies today.** If we add analytics we will update this
  document, and where consent is required we will ask for it before setting
  anything.`,

    `## 3. Third parties during payment

When you pay, you are handed to a payment provider — eSewa, Khalti, Fonepay, or
a bank. Those sites set their own cookies under their own policies, which we do
not control. Read theirs if you want to know what they store.`,

    `## 4. Controlling cookies

Every major browser lets you see, block, and delete cookies in its settings.
Blocking the cookies above will not affect the public website, but it will stop
you signing in to the admin panel or client portal.`,

    `## 5. Changes and contact

This document is versioned; when it changes, a new version is published with a
new effective date.

${CONTACT_BLOCK}`,
  ),
};
