/**
 * Platform settings.
 *
 * The case that matters is the last describe: a stored value that no longer
 * passes validation must fall back to the coded default rather than throw.
 * These numbers are read while rendering a page and while deciding whether to
 * suspend an account — a bad row is a bug, but a crash there is worse.
 */
import { describe, expect, test } from 'vitest';

import {
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
} from '@/lib/settings/definitions';
import { definitionFor, resolve, validate } from '@/lib/settings/registry';

describe('definitions', () => {
  test('keys are unique', () => {
    const keys = SETTING_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('keys match the format the database enforces', () => {
    for (const { key } of SETTING_DEFINITIONS) {
      expect(key).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
    }
  });

  test('every definition belongs to a declared group', () => {
    for (const { group } of SETTING_DEFINITIONS) {
      expect(SETTING_GROUPS).toContain(group);
    }
  });

  test('every default is itself valid', () => {
    for (const { key, default: value } of SETTING_DEFINITIONS) {
      expect(validate(key, value), `${key} default`).toMatchObject({
        ok: true,
      });
    }
  });
});

describe('validate', () => {
  test('rejects a key nothing declares', () => {
    expect(validate('billing.made_up', '5')).toMatchObject({ ok: false });
  });

  test('rejects a non-number for a numeric setting', () => {
    expect(validate('billing.grace_days', 'soon')).toMatchObject({ ok: false });
  });

  test('rejects a decimal where a whole number is required', () => {
    expect(validate('billing.grace_days', '7.5')).toMatchObject({ ok: false });
  });

  test('accepts a decimal for a decimal setting', () => {
    expect(validate('support.uptime_target_percent', '99.95')).toMatchObject({
      ok: true,
    });
  });

  test('enforces the declared bounds', () => {
    expect(validate('billing.vat_rate_percent', '-1')).toMatchObject({
      ok: false,
    });
    expect(validate('billing.vat_rate_percent', '101')).toMatchObject({
      ok: false,
    });
    expect(validate('billing.vat_rate_percent', '13')).toMatchObject({
      ok: true,
    });
  });

  test('trims what it stores', () => {
    expect(validate('company.pan', '  601234567  ')).toMatchObject({
      ok: true,
      value: '601234567',
    });
  });

  test('an empty contact detail is allowed — blank beats invented', () => {
    expect(validate('company.support_email', '')).toMatchObject({ ok: true });
  });

  test('a malformed email is not', () => {
    expect(validate('company.support_email', 'support@')).toMatchObject({
      ok: false,
    });
  });
});

describe('resolve', () => {
  test('falls back to the coded default when nothing is stored', () => {
    const settings = resolve(new Map());

    expect(settings.number('billing.invoice_due_days')).toBe(15);
    expect(settings.number('billing.grace_days')).toBe(7);
    expect(settings.number('billing.refund_window_days')).toBe(7);
  });

  test('a stored override wins', () => {
    const settings = resolve(new Map([['billing.grace_days', '14']]));

    expect(settings.number('billing.grace_days')).toBe(14);
  });

  test('a stored value that no longer validates falls back, not throws', () => {
    const settings = resolve(new Map([['billing.grace_days', '900']]));

    expect(settings.number('billing.grace_days')).toBe(
      Number(definitionFor('billing.grace_days')?.default),
    );
  });

  test('reading a key nothing declares is a programming error', () => {
    expect(() => resolve(new Map()).number('billing.made_up')).toThrow();
  });
});
