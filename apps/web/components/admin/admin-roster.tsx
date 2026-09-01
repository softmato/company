import { PendingAdminActions } from '@/components/admin/pending-admin-actions';
import type { RosterEntry } from '@/lib/admin/roster';

/**
 * Read-only for anyone who can sign in.
 *
 * Deactivating and resetting an *enrolled* admin stays on the CLI (`pnpm
 * admin:enrol -- --reset`), for the reason `/admin/security` already gives:
 * with two founders, the account that would perform a reset is as likely to be
 * the locked-out one. A button here would be the wrong tool at the exact
 * moment it is needed, and a takeover primitive the rest of the time.
 *
 * An admin awaiting enrolment is a different thing and gets controls. The row
 * holds no secret, no session and no history, and `authorize()` refuses it
 * before it reads a password — so re-issuing its link or deleting it takes
 * nothing from anyone and cannot be a takeover. Losing the one-shot handoff QR
 * is an ordinary mistake, and a terminal is the wrong place to recover from it.
 */
export function AdminRoster({
  admins,
  currentId,
}: {
  admins: RosterEntry[];
  currentId: number;
}) {
  return (
    <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
      {admins.map((admin) => (
        <li key={admin.id} className="px-4 py-3">
          <div className="flex items-baseline gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {admin.name}
                {admin.id === currentId ? (
                  <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                    you
                  </span>
                ) : null}
              </p>
              <p className="truncate text-[13px] text-muted-foreground">
                {admin.email}
              </p>
            </div>

            <span
              className={
                admin.isActive
                  ? 'text-[13px] text-muted-foreground'
                  : 'text-[13px] text-destructive'
              }
            >
              {admin.isActive
                ? 'Active'
                : admin.totpEnabled
                  ? 'Deactivated'
                  : 'Awaiting enrolment'}
            </span>
          </div>

          {/*
            Awaiting enrolment only — not "deactivated", which is an enrolled
            admin who kept their secret and is one CLI command from returning.
            Deleting that row would throw the secret away.
          */}
          {!admin.isActive && !admin.totpEnabled ? (
            <PendingAdminActions
              admin={{ id: admin.id, email: admin.email, name: admin.name }}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
