import { BrandMark } from '@/components/brand/brand-mark';
import { bankMark } from '@/lib/brand/bank-marks';

/**
 * A bank's mark, on the same terms as `ProviderMark`.
 *
 * No screen calls this yet — nothing in the schema records a bank. It exists
 * so that when Fonepay's integration lands (PHASES.md Phase 9) the marks are
 * already addressable by slug, and see `lib/brand/bank-marks.ts` for why that
 * phase, and not this change, is where a bank list belongs.
 */
export function BankMark({
  slug,
  size,
  alt,
  className,
}: {
  slug: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const asset = bankMark(slug);
  if (!asset) return null;

  return (
    <BrandMark
      asset={asset}
      plate
      {...(size === undefined ? {} : { size })}
      {...(alt === undefined ? {} : { alt })}
      {...(className === undefined ? {} : { className })}
    />
  );
}
