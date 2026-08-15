/**
 * Email templates.
 *
 * The case that matters is escaping. Every field in a contact enquiry is typed
 * by a stranger and the result is mailed from our own domain, so an unescaped
 * `<` is not a rendering bug — it is a phishing email with our name on it.
 */
import { describe, expect, test } from 'vitest';

import { escapeHtml, paragraph } from '@/lib/email/html';
import { contactEnquiryEmail } from '@/lib/email/templates/contact-enquiry';

const enquiry = {
  id: 42,
  name: 'Ram Bahadur',
  email: 'ram@example.com',
  phone: '+977 9800000000',
  subject: 'Payment integration',
  message: 'We need Khalti and eSewa.\nCan we talk this week?',
};

describe('escapeHtml', () => {
  test('neutralises the characters that start a tag or close an attribute', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  test('escapes the ampersand first, so nothing is double-decoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('paragraph', () => {
  test('keeps typed line breaks but not typed markup', () => {
    expect(paragraph('one\ntwo <b>')).toBe('one<br />two &lt;b&gt;');
  });
});

describe('contactEnquiryEmail', () => {
  test('subject follows the enquiry subject when there is one', () => {
    expect(contactEnquiryEmail(enquiry).subject).toBe(
      'Contact: Payment integration',
    );
  });

  test('falls back to the sender name when there is no subject', () => {
    expect(contactEnquiryEmail({ ...enquiry, subject: null }).subject).toBe(
      'Contact from Ram Bahadur',
    );
  });

  test('carries every field into both parts', () => {
    const { html, text } = contactEnquiryEmail(enquiry);

    for (const value of [enquiry.email, enquiry.phone, 'Khalti and eSewa']) {
      expect(html).toContain(value);
      expect(text).toContain(value);
    }

    expect(text).toContain('Submission #42');
  });

  test('a missing phone or subject renders as a dash, not "null"', () => {
    const { html, text } = contactEnquiryEmail({
      ...enquiry,
      phone: null,
      subject: null,
    });

    expect(html).not.toContain('null');
    expect(text).not.toContain('null');
  });

  test('markup in any field is escaped, not emitted', () => {
    const { html } = contactEnquiryEmail({
      ...enquiry,
      name: '<img src=x onerror=alert(1)>',
      subject: '</h1><a href="https://phish.example">Click</a>',
      message: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<a href');
    expect(html).toContain('&lt;script&gt;');
  });
});
