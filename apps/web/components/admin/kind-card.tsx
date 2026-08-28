import Link from 'next/link';

import type { ContentKind } from '@/lib/cms';
import { Card } from '@/components/ui/card';

/**
 * One content kind on the CMS index, with its draft/published counts.
 *
 * The count is the useful part: it is the fastest way to see that five of the
 * six legal documents are live and one is still sitting in draft.
 */
export function KindCard({
  kind,
  total,
  published,
}: {
  kind: ContentKind;
  total: number;
  published: number;
}) {
  return (
    <Link
      href={`/admin/cms/${kind.slug}`}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="h-full px-5 py-4 transition-colors duration-150 hover:border-primary/40">
        <div className="flex items-baseline justify-between gap-3">
          <span className="headline text-[16px]">{kind.label}</span>
          <span className="numeric shrink-0 text-xs text-muted-foreground">
            {published}/{total} published
          </span>
        </div>

        <p className="mt-1.5 text-sm text-muted-foreground">
          {kind.description}
        </p>
      </Card>
    </Link>
  );
}
