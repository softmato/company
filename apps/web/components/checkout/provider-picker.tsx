'use client';

/**
 * The provider radio list.
 *
 * The list comes from the server already intersected against what is
 * registered and active, so this component renders what it is given and holds
 * no opinion about which providers exist. The version it replaces kept a
 * `PROVIDER_META` map with `fonepay`, `esewa` and `khalti` hardcoded and fell
 * back to the raw id for anything else — which meant a provider the server had
 * deliberately withheld could still be drawn if it reached the array.
 *
 * Built as real radio inputs rather than buttons. The previous implementation
 * used `<button>` elements with a hand-drawn circle, which looks identical and
 * is not: arrow keys do not move between them, nothing announces "2 of 3", and
 * there is no group label. This is the one control on the page.
 */
import {
  EsewaIcon,
  FonepayIcon,
  KhaltiIcon,
} from '@/components/checkout/provider-icons';
import type { CheckoutProvider } from '@/lib/checkout/view';
import type { ProviderId } from '@softmato/payment-core';

/** Presentation only — never the source of which providers are offered. */
const ICONS: Record<ProviderId, React.ReactNode> = {
  fonepay: <FonepayIcon className="h-6 w-6" />,
  esewa: <EsewaIcon className="h-6 w-6" />,
  khalti: <KhaltiIcon className="h-6 w-6" />,
};

interface ProviderPickerProps {
  providers: CheckoutProvider[];
  selected: ProviderId | null;
  onSelect: (id: ProviderId) => void;
  disabled?: boolean;
}

export function ProviderPicker({
  providers,
  selected,
  onSelect,
  disabled = false,
}: ProviderPickerProps) {
  return (
    <fieldset
      className="divide-y divide-border overflow-hidden rounded-xl border border-border"
      disabled={disabled}
    >
      <legend className="sr-only">Choose a payment method</legend>

      {providers.map(({ id, displayName }) => {
        const active = selected === id;

        return (
          <label
            key={id}
            className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-inset ${
              active ? 'bg-primary/[0.04]' : 'bg-card hover:bg-surface'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value={id}
              checked={active}
              onChange={() => onSelect(id)}
              className="peer sr-only"
            />

            <span
              aria-hidden
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active ? 'border-primary' : 'border-border'
              }`}
            >
              {active ? (
                <span className="h-2 w-2 rounded-full bg-primary" />
              ) : null}
            </span>

            {ICONS[id]}

            {/* The database's display name, not a hardcoded label. */}
            <span className="font-medium text-foreground">{displayName}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
