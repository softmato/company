'use client';

import { useActionState } from 'react';

import {
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
  type SettingDefinition,
} from '@/lib/settings/definitions';
import { saveSettings } from '@/app/(admin)/admin/settings/actions';
import { SubmitButton } from '@/components/admin/submit-button';

/**
 * One form for every setting, grouped as the definitions declare.
 *
 * Values that are still the coded default render as the default rather than
 * empty, so the form always shows what the platform is actually using — an
 * empty box next to "Grace period" would suggest there isn't one.
 */
export function SettingsForm({
  stored,
}: {
  /** Only the overrides. Defaults come from the definitions. */
  stored: Record<string, string>;
}) {
  const [state, action] = useActionState(saveSettings, undefined);

  return (
    <form action={action} className="mt-6">
      {SETTING_GROUPS.map((group) => {
        const definitions = SETTING_DEFINITIONS.filter(
          (definition) => definition.group === group,
        );
        if (definitions.length === 0) return null;

        return (
          <fieldset key={group} className="mb-8">
            <legend className="eyebrow text-xs text-muted-foreground">
              {group}
            </legend>

            <div className="mt-3 space-y-5">
              {definitions.map((definition) => (
                <SettingField
                  key={definition.key}
                  definition={definition}
                  value={stored[definition.key] ?? definition.default}
                  overridden={definition.key in stored}
                  error={state?.fieldErrors?.[definition.key]}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="flex items-center gap-3">
        <SubmitButton>Save settings</SubmitButton>

        {state?.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function SettingField({
  definition,
  value,
  overridden,
  error,
}: {
  definition: SettingDefinition;
  value: string;
  /** Whether the stored row differs from the coded default. */
  overridden: boolean;
  error?: string | undefined;
}) {
  const numeric =
    definition.kind === 'integer' || definition.kind === 'decimal';

  if (definition.kind === 'boolean') {
    return (
      <div>
        {/*
         * A hidden 'false' before the checkbox: an unchecked box sends nothing
         * at all, which would read as "leave it alone" rather than "turn it
         * off" — and a VAT switch that cannot be turned back off is a bug with
         * a tax authority on the other end.
         */}
        <input type="hidden" name={definition.key} value="false" />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name={definition.key}
            value="true"
            defaultChecked={value === 'true'}
            aria-describedby={`${definition.key}-help`}
            className="size-4 rounded-sm border-input"
          />
          {definition.label}
          {!overridden ? (
            <span className="text-xs font-normal text-muted-foreground">
              default
            </span>
          ) : null}
        </label>

        <p
          id={`${definition.key}-help`}
          className="mt-1 text-xs text-muted-foreground"
        >
          {definition.help}
        </p>

        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={definition.key}
        className="flex items-baseline justify-between text-sm font-medium"
      >
        {definition.label}
        {!overridden ? (
          <span className="text-xs font-normal text-muted-foreground">
            default
          </span>
        ) : null}
      </label>

      <div className="mt-1 flex items-center gap-2">
        <input
          id={definition.key}
          name={definition.key}
          defaultValue={value}
          inputMode={numeric ? 'decimal' : undefined}
          type={definition.kind === 'email' ? 'email' : 'text'}
          aria-describedby={`${definition.key}-help`}
          aria-invalid={error ? true : undefined}
          className={`numeric w-full rounded-md border bg-background px-3 py-2 text-sm ${
            error ? 'border-destructive' : 'border-input'
          }`}
        />

        {definition.unit ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {definition.unit}
          </span>
        ) : null}
      </div>

      <p
        id={`${definition.key}-help`}
        className="mt-1 text-xs text-muted-foreground"
      >
        {definition.help}
      </p>

      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
