import { ProviderMark } from '@/components/brand/provider-mark';
import { walletMark } from '@/lib/brand/wallet-marks';

/**
 * A provider's mark and its name, as one inline unit for a table cell.
 *
 * Every admin table used to print the raw `provider_id` in
 * `font-semibold uppercase text-primary` — `ESEWA`, `KHALTI`. The uppercase is
 * gone with the mark arriving: `eSewa` is how the company writes itself, and a
 * table that shouts three brand names in accent colour was reading as a column
 * of links.
 *
 * `name` wins when the caller has the database's `display_name`, which is the
 * name the customer was actually shown. The registry's label is the fallback,
 * and the raw id is the last resort so an unknown provider still renders as
 * something.
 */
export function ProviderBadge({
  id,
  name,
  size = 20,
  className,
}: {
  id: string;
  name?: string | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2${className ? ` ${className}` : ''}`}
    >
      <ProviderMark id={id} size={size} />
      <span className="font-medium text-foreground">
        {name ?? walletMark(id)?.label ?? id}
      </span>
    </span>
  );
}
