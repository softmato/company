/** Platform settings. Composition only — the form is a component. */
import { getStoredSettings } from '@/lib/settings/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const stored = await getStoredSettings();

  return (
    <div className="max-w-2xl">
      <Breadcrumbs trail={[]}>Settings</Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">Settings</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        The operational numbers the platform runs on. Changing one takes effect
        on the next request — no deploy. Every change is written to the audit
        log, because these decide when a customer is suspended and how much tax
        is charged.
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        Several of these are also stated in the legal documents. Change both
        together, or the policy and the platform will disagree in front of a
        customer.
      </p>

      <SettingsForm stored={Object.fromEntries(stored)} />
    </div>
  );
}
