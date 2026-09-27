/**
 * The spam check's promise is precision: real enquiries — including ones with
 * a couple of links, Nepali text, or an SEO request — must pass.
 */
import { describe, expect, test } from 'vitest';

import { spamReason } from '@/lib/contact/spam';

const human = { name: 'Sita Gurung', elapsedMs: 45_000 };

describe('spamReason passes real enquiries', () => {
  test.each([
    'We need a booking website for our hostel in Pokhara with eSewa.',
    'मलाई होस्टलको लागि बुकिङ वेबसाइट चाहियो।',
    'Can you do SEO for our site? We are not on Google at all.',
    'Like https://airbnb.com and https://booking.com but simpler.',
  ])('%s', (message) => {
    expect(spamReason({ ...human, message })).toBeNull();
  });

  test('a single weak signal is not enough', () => {
    expect(
      spamReason({ ...human, elapsedMs: null, message: 'See www.a.com' }),
    ).toBeNull();
    expect(
      spamReason({ ...human, elapsedMs: 1200, message: 'Need an app' }),
    ).toBeNull();
  });
});

describe('spamReason flags spam', () => {
  test('a link in the name', () => {
    expect(
      spamReason({ ...human, name: 'Visit cheap-seo.xyz', message: 'Hello' }),
    ).toContain('link in the name');
  });

  test('a backlink pitch with links', () => {
    expect(
      spamReason({
        ...human,
        message:
          'We sell dofollow backlinks: https://x.io https://y.io — reply!',
      }),
    ).not.toBeNull();
  });

  test('a bot that posts instantly without JavaScript and links', () => {
    expect(
      spamReason({
        name: 'Anna',
        elapsedMs: null,
        message: 'https://a.ru https://b.ru https://c.ru https://d.ru',
      }),
    ).not.toBeNull();
  });

  test('Cyrillic with a link', () => {
    expect(
      spamReason({
        ...human,
        message: 'Привет, лучшие цены на продвижение https://x.ru',
      }),
    ).not.toBeNull();
  });
});
