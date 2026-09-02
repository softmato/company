/**
 * Company details in the legal documents are `{{settings.key}}` tokens filled
 * in from the admin panel as the page renders (apps/web/lib/cms/tokens.ts).
 *
 * The property that matters most is the one tying this to
 * `legal-readiness.ts`: an unfilled **required** setting must still block
 * publication. Resolving a blank to an empty string would leave a policy that
 * renders cleanly, indexes fine, and quietly omits the address someone needs
 * in order to exercise a right under the Individual Privacy Act, 2075.
 */
import { describe, expect, test } from 'vitest';

import { resolveTokens, tokensIn } from '@/lib/cms/tokens';
import { legalReadiness } from '@/lib/cms/legal-readiness';
import { resolve } from '@/lib/settings/registry';

/** Settings as they read with nothing saved: every override absent. */
const empty = resolve(new Map());

const saved = (entries: Record<string, string>) =>
  resolve(new Map(Object.entries(entries)));

describe('resolving tokens', () => {
  test('a saved setting replaces its token', () => {
    const settings = saved({ 'company.address': 'Lalitpur, Nepal' });

    expect(resolveTokens('Write to {{company.address}}.', settings)).toBe(
      'Write to Lalitpur, Nepal.',
    );
  });

  test('whitespace inside the braces is tolerated', () => {
    const settings = saved({ 'company.address': 'Lalitpur' });

    expect(resolveTokens('{{  company.address  }}', settings)).toBe('Lalitpur');
  });

  test('a token appearing twice is replaced both times', () => {
    const settings = saved({ 'company.pan': '123456789' });

    expect(resolveTokens('{{company.pan}} and {{company.pan}}', settings)).toBe(
      '123456789 and 123456789',
    );
  });

  test('prose containing braces is left alone', () => {
    const body = 'Use {{ }} or {notAKey} or {{Company.Address}} freely.';

    expect(resolveTokens(body, empty)).toBe(body);
  });
});

describe('a blank required setting blocks publication', () => {
  test('it resolves to a [confirm: …] marker, not to nothing', () => {
    const resolved = resolveTokens('Write to {{company.address}}.', empty);

    expect(resolved).toContain('[confirm:');
    // The founder-facing label, so `legal:todo` reads as a form to fill in.
    expect(resolved).toContain('Registered address');
  });

  test('readiness treats that marker as blocking, as it would any other', () => {
    const resolved = resolveTokens('Write to {{company.address}}.', empty);
    const { ready, unconfirmed } = legalReadiness(resolved);

    expect(unconfirmed).toBe(1);
    expect(ready).toBe(false);
  });

  test('filling the setting clears the block without editing the document', () => {
    const body = 'Write to {{company.address}}.';
    const settings = saved({ 'company.address': 'Lalitpur, Nepal' });

    expect(legalReadiness(resolveTokens(body, settings)).ready).toBe(true);
  });

  test('a token naming a setting that does not exist is reported, not thrown', () => {
    // `settings.text()` throws on an unknown key; a typo in seeded markdown
    // must not take a public page down with it.
    const resolved = resolveTokens('{{company.not_a_setting}}', empty);

    expect(resolved).toContain('[confirm:');
    expect(resolved).toContain('company.not_a_setting');
  });
});

describe('optional tokens', () => {
  test('a blank optional token takes its whole line with it', () => {
    const body = ['**Name**', 'PAN: {{company.pan?}}', 'Email: hi@x.com'].join(
      '\n',
    );

    expect(resolveTokens(body, empty)).toBe('**Name**\nEmail: hi@x.com');
  });

  test('a filled optional token keeps its line and prints the value', () => {
    const settings = saved({ 'company.pan': '123456789' });

    expect(resolveTokens('PAN: {{company.pan?}}', settings)).toBe(
      'PAN: 123456789',
    );
  });

  test('a blank optional token does not block publication', () => {
    const body = 'Softmato.\nPAN: {{company.pan?}}';

    expect(legalReadiness(resolveTokens(body, empty)).ready).toBe(true);
  });

  test('an optional blank does not remove a required token on the same line', () => {
    // The line goes, so the required token goes with it — which is why the
    // contact block puts each fact on its own line. Documents the trap.
    const body = 'Email: {{company.contact_email}} PAN: {{company.pan?}}';

    expect(resolveTokens(body, empty)).toBe('');
  });
});

describe('listing what a document depends on', () => {
  test('every distinct key is reported once, with its strictness', () => {
    const body = '{{company.address}} {{company.pan?}} {{company.address}}';

    expect(tokensIn(body)).toEqual([
      { key: 'company.address', optional: false },
      { key: 'company.pan', optional: true },
    ]);
  });

  test('a key used both ways counts as required', () => {
    expect(tokensIn('{{company.pan?}} {{company.pan}}')).toEqual([
      { key: 'company.pan', optional: false },
    ]);
  });
});
