/**
 * Portal mail carries text people typed — message bodies, deliverable titles,
 * client names — so it must be escaped in HTML, and every email must carry its
 * link in the text part for clients who read mail as plain text.
 */
import { describe, expect, test } from 'vitest';

import {
  portalInvitationEmail,
  portalMessageEmail,
  portalReviewEmail,
} from '@/lib/email/templates/portal';

describe('portal emails', () => {
  test('a message body cannot inject markup', () => {
    const mail = portalMessageEmail({
      to: 'client',
      authorName: 'Sidd',
      clientName: 'Tea <b>Co</b>',
      projectName: 'Shop',
      body: '<script>alert(1)</script>',
      url: 'https://agency.softmato.com/projects/1',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.text).toContain('https://agency.softmato.com/projects/1');
  });

  test('an invitation is security mail and says when it expires', () => {
    const mail = portalInvitationEmail({
      name: 'Asha Gurung',
      clientName: 'Himalayan Tea',
      url: 'https://agency.softmato.com/invite/abc',
      expiresIn: 'in 7 days',
      reset: false,
    });
    expect(mail.category).toBe('security');
    expect(mail.text).toContain('Hi Asha');
    expect(mail.text).toContain('https://agency.softmato.com/invite/abc');
    expect(mail.text).toContain('in 7 days');
  });

  test('a reset reads as a reset', () => {
    const mail = portalInvitationEmail({
      name: 'Asha',
      clientName: 'Himalayan Tea',
      url: 'https://x/invite/abc',
      expiresIn: 'in 7 days',
      reset: true,
    });
    expect(mail.subject).toMatch(/new password/i);
  });

  test('a review request names the deliverable', () => {
    const mail = portalReviewEmail({
      projectName: 'Shop',
      title: 'Homepage & product page',
      url: 'https://x/projects/1',
    });
    expect(mail.subject).toContain('Homepage & product page');
    expect(mail.html).toContain('Homepage &amp; product page');
  });
});
