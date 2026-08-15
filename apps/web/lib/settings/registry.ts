/**
 * Validation and reading for settings values.
 *
 * Pure — no database, no `server-only` — so the rules are unit tested directly
 * and the same function validates a form submission and a stored row. A value
 * that got into the table before a rule tightened must not crash a page, so
 * reading falls back to the default rather than throwing.
 */
import { SETTING_DEFINITIONS, type SettingDefinition } from './definitions';

const BY_KEY = new Map(SETTING_DEFINITIONS.map((d) => [d.key, d]));

export function definitionFor(key: string): SettingDefinition | undefined {
  return BY_KEY.get(key);
}

export type ValidationResult =
  { ok: true; value: string } | { ok: false; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Nepali numbers with or without +977, spaces and hyphens tolerated. */
const PHONE = /^\+?[0-9][0-9\s-]{6,19}$/;

/**
 * Checks a submitted value against its definition and returns what to store.
 *
 * An empty string is allowed for text-ish settings and means "not set yet" —
 * the contact details are blank until the founder fills them in, and a blank
 * is honest where a made-up address is not.
 */
export function validate(key: string, raw: string): ValidationResult {
  const definition = definitionFor(key);
  if (!definition) return { ok: false, message: 'Unknown setting.' };

  const value = raw.trim();

  switch (definition.kind) {
    case 'integer':
    case 'decimal': {
      if (value === '') return { ok: false, message: 'A number is required.' };

      const pattern =
        definition.kind === 'integer' ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
      if (!pattern.test(value)) {
        return {
          ok: false,
          message:
            definition.kind === 'integer'
              ? 'Enter a whole number.'
              : 'Enter a number, like 13 or 99.5.',
        };
      }

      const numeric = Number(value);
      if (definition.min !== undefined && numeric < definition.min) {
        return { ok: false, message: `Cannot be below ${definition.min}.` };
      }
      if (definition.max !== undefined && numeric > definition.max) {
        return { ok: false, message: `Cannot be above ${definition.max}.` };
      }

      return { ok: true, value };
    }

    case 'email':
      if (value !== '' && !EMAIL.test(value)) {
        return {
          ok: false,
          message: 'That does not look like an email address.',
        };
      }
      return { ok: true, value };

    case 'phone':
      if (value !== '' && !PHONE.test(value)) {
        return {
          ok: false,
          message: 'That does not look like a phone number.',
        };
      }
      return { ok: true, value };

    case 'boolean':
      if (value !== 'true' && value !== 'false') {
        return { ok: false, message: 'Must be on or off.' };
      }
      return { ok: true, value };

    case 'text':
      if (value.length > 500) {
        return { ok: false, message: 'Keep it under 500 characters.' };
      }
      return { ok: true, value };
  }
}

/** Stored strings, resolved to the values the application reads. */
export interface Settings {
  number(key: string): number;
  text(key: string): string;
  boolean(key: string): boolean;
}

export function resolve(stored: Map<string, string>): Settings {
  function raw(key: string): string {
    const definition = definitionFor(key);
    if (!definition) throw new Error(`Unknown setting: ${key}`);

    const override = stored.get(key);
    if (override === undefined) return definition.default;

    // A stored value that no longer validates is ignored, not thrown on.
    return validate(key, override).ok ? override : definition.default;
  }

  return {
    number: (key) => Number(raw(key)),
    text: (key) => raw(key),
    boolean: (key) => raw(key) === 'true',
  };
}
