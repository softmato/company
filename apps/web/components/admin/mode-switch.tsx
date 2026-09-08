import { CREDENTIAL_MODE_LABEL, type CredentialMode } from '@softmato/db';

import { setAdminMode } from '@/app/(admin)/admin/mode-actions';

const MODES: readonly CredentialMode[] = ['live', 'test'];

/**
 * The Sandbox/Production switch, in the admin header so it is on every page.
 *
 * Deliberately not a quiet preference tucked into settings. Which mode is
 * showing changes what every figure in the section means, so it sits next to
 * the figures and says which one it is even when nobody is touching it.
 */
export function AdminModeSwitch({ mode }: { mode: CredentialMode }) {
  return (
    <form
      action={setAdminMode}
      aria-label="Which activity the admin section describes"
      className="flex items-center gap-0.5 rounded-lg border border-border p-0.5"
    >
      {MODES.map((option) => {
        const active = option === mode;

        return (
          <button
            key={option}
            type="submit"
            name="mode"
            value={option}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              active
                ? option === 'live'
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {CREDENTIAL_MODE_LABEL[option]}
          </button>
        );
      })}
    </form>
  );
}
