import { BrandMark } from '@/components/brand/brand-mark';
import { walletMark } from '@/lib/brand/wallet-marks';

/**
 * A payment provider's mark, or nothing at all.
 *
 * Nothing, rather than a placeholder, when the id has no mark: every caller
 * draws a name next to this, so an unrecognised provider degrades to the name
 * on its own. A broken-image glyph beside a correct label would be the only
 * worse outcome.
 */
export function ProviderMark({
  id,
  size,
  alt,
  className,
}: {
  id: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const asset = walletMark(id);
  if (!asset) return null;

  return (
    <BrandMark
      asset={asset}
      {...(size === undefined ? {} : { size })}
      {...(alt === undefined ? {} : { alt })}
      {...(className === undefined ? {} : { className })}
    />
  );
}
