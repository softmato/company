'use client';

import { useActionState } from 'react';

import { cn } from '@/lib/cn';
import {
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
  type SettingDefinition,
} from '@/lib/settings/definitions';
import { saveSettings } from '@/app/(admin)/admin/settings/actions';
import { Input } from '@/components/ui/input';
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
    <form action={action} className="mt-6 pb-24">
      {SETTING_GROUPS.map((group) => {
        const definitions = SETTING_DEFINITIONS.filter(
          (definition) => definition.group === group,
        );
        if (definitions.length === 0) return null;

        return (
          <fieldset key={group} className="mb-9">
            <legend className="eyebrow">{group}</legend>

            <div className="mt-3.5 grid gap-5">
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

      {/*
       * Sticky (docs/UI_BRIEF.md §3.2). This is a long form — a save button
       * that scrolled away would mean editing the VAT rate at the top and
       * scrolling past thirty fields to commit it.
       */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>

          {state?.message ? (
            <p
              role="status"
              className={cn(
                'text-sm',
                state.ok ? 'text-muted-foreground' : 'text-destructive',
              )}
            >
              {state.message}
            </p>
          ) : null}
        </div>
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
  const helpId = `${definition.key}-help`;
  const errorId = `${definition.key}-error`;
  const describedBy = error ? `${errorId} ${helpId}` : helpId;

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
            aria-describedby={describedBy}
            className="size-4 rounded-sm border-input accent-[var(--primary)]"
          />
          {definition.label}
          {!overridden ? <DefaultMarker /> : null}
        </label>

        <p id={helpId} className="mt-1.5 text-[13px] text-muted-foreground">
          {definition.help}
        </p>

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1 text-[13px] text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  /*
   * Mono is for figures, not for every field. Setting an address or a support
   * email in tabular mono makes prose look like data and costs the numbers
   * the distinction that mono is carrying in the first place.
   */
  const numeric =
    definition.kind === 'integer' || definition.kind === 'decimal';

  return (
    <div>
      <label
        htmlFor={definition.key}
        className="flex items-baseline justify-between gap-3 text-sm font-medium"
      >
        {definition.label}
        {!overridden ? <DefaultMarker /> : null}
      </label>

      <div className="mt-1.5 flex items-center gap-2">
        <Input
          id={definition.key}
          name={definition.key}
          defaultValue={value}
          inputMode={numeric ? 'decimal' : undefined}
          type={definition.kind === 'email' ? 'email' : 'text'}
          aria-describedby={describedBy}
          invalid={Boolean(error)}
          className={numeric ? 'numeric' : undefined}
        />

        {definition.unit ? (
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {definition.unit}
          </span>
        ) : null}
      </div>

      <p id={helpId} className="mt-1.5 text-[13px] text-muted-foreground">
        {definition.help}
      </p>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[13px] text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "Legible but quiet" (docs/UI_BRIEF.md §3.2) — it is context, not a warning. */
function DefaultMarker() {
  return (
    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
      default
    </span>
  );
}
