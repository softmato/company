import { Badge } from '@/components/ui/badge';

/**
 * Draft/published badge.
 *
 * Deliberately not `--credit`: that colour means money in, and reusing it for
 * a publication state would erode the one signal that has to stay
 * unambiguous on a ledger screen. Published takes the emerald `primary` tone
 * instead, draft the quiet one.
 */
export function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return (
    <Badge status={status}>
      {status === 'published' ? 'Published' : 'Draft'}
    </Badge>
  );
}
