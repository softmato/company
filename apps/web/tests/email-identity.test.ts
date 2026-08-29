/**
 * The sender identity — which mailbox mail leaves from, and where a reply to
 * it lands (docs/EMAIL_SYSTEM.md §2).
 *
 * Two cases here are not cosmetic. The sender name is editable from the admin
 * panel and is interpolated straight into a mail header, so a name carrying
 * `<>` is an envelope-rewriting attack rather than a rendering bug. And the
 * reply address is the one part of an email that cannot be verified by sending
 * one: Resend reports success either way, and a wrong address surfaces days
 * later as a bounce in someone else's inbox.
 */
import { describe, expect, test } from 'vitest';

import {
  DEFAULT_MAILBOXES,
  EMAIL_CATEGORIES,
  NAME_SUFFIX,
} from '@/lib/email/categories';
import {
  fromHeaderFor,
  replyToFor,
  SHIPPED_SENDER_NAME,
  type EmailIdentity,
} from '@/lib/email/identity';

const identity: EmailIdentity = {
  domain: 'softmato.com',
  mailboxes: { ...DEFAULT_MAILBOXES },
  replyTo: '',
  senderName: 'Softmato',
};

describe('categories', () => {
  test('every category has a mailbox and a display suffix', () => {
    for (const category of EMAIL_CATEGORIES) {
      expect(DEFAULT_MAILBOXES[category]).toBeTruthy();
      expect(NAME_SUFFIX[category]).toBeDefined();
    }
  });
});

describe('fromHeaderFor', () => {
  test('sends each category from its own mailbox', () => {
    expect(fromHeaderFor('billing', identity)).toBe(
      'Softmato Billing <billing@softmato.com>',
    );
    expect(fromHeaderFor('alert', identity)).toBe(
      'Softmato Alerts <alert@softmato.com>',
    );
    expect(fromHeaderFor('security', identity)).toBe(
      'Softmato Security <security@softmato.com>',
    );
  });

  test('info and noreply speak as the company, with no suffix', () => {
    expect(fromHeaderFor('info', identity)).toBe(
      'Softmato <info@softmato.com>',
    );
    expect(fromHeaderFor('noreply', identity)).toBe(
      'Softmato <noreply@softmato.com>',
    );
  });

  test('honours a mailbox the founder renamed', () => {
    const renamed = {
      ...identity,
      mailboxes: { ...DEFAULT_MAILBOXES, billing: 'accounts' },
    };

    expect(fromHeaderFor('billing', renamed)).toBe(
      'Softmato Billing <accounts@softmato.com>',
    );
  });

  test('falls back to the default mailbox when one is left blank', () => {
    const blank = {
      ...identity,
      mailboxes: { ...DEFAULT_MAILBOXES, support: '' },
    };

    expect(fromHeaderFor('support', blank)).toBe(
      'Softmato Support <support@softmato.com>',
    );
  });

  test('tolerates a domain typed with its leading @', () => {
    expect(
      fromHeaderFor('info', { ...identity, domain: '@softmato.com' }),
    ).toBe('Softmato <info@softmato.com>');
  });

  /**
   * The whole point of stripping rather than escaping: a sender name is
   * admin-editable, and these characters are how a header gets rewritten.
   */
  test('strips the characters that would rewrite the envelope', () => {
    const header = fromHeaderFor('info', {
      ...identity,
      senderName: 'Softmato" <attacker@evil.test>, x',
    });

    expect(header).toBe('Softmato attacker@evil.test x <info@softmato.com>');
    expect(header).not.toContain('<attacker@evil.test>');
  });

  /**
   * Sanitise before falling back, not after. `"<>` is truthy, so a check for
   * an empty name passes it through — and it then sanitises down to nothing,
   * sending the mail as a bare address with no branding at all.
   */
  test('a name that sanitises to nothing falls back to the shipped name', () => {
    expect(fromHeaderFor('info', { ...identity, senderName: '"<>' })).toBe(
      `${SHIPPED_SENDER_NAME} <info@softmato.com>`,
    );
  });

  test('no domain is email switched off, not a crash', () => {
    expect(fromHeaderFor('info', { ...identity, domain: '  ' })).toBeNull();
  });
});

describe('replyToFor', () => {
  test('derives info@ on the sending domain when nothing is configured', () => {
    expect(replyToFor('billing', identity)).toBe('info@softmato.com');
  });

  test('an explicitly configured address wins', () => {
    expect(
      replyToFor('billing', { ...identity, replyTo: 'ops@softmato.com' }),
    ).toBe('ops@softmato.com');
  });

  test('noreply carries no reply address — that is the whole category', () => {
    expect(replyToFor('noreply', identity)).toBe('');
    expect(
      replyToFor('noreply', { ...identity, replyTo: 'ops@softmato.com' }),
    ).toBe('');
  });

  test('follows a renamed info mailbox, since that is what receives', () => {
    const renamed = {
      ...identity,
      mailboxes: { ...DEFAULT_MAILBOXES, info: 'hello' },
    };

    expect(replyToFor('support', renamed)).toBe('hello@softmato.com');
  });

  test('no domain means no reply address to offer', () => {
    expect(replyToFor('info', { ...identity, domain: '' })).toBe('');
  });
});
