import { Rocket } from 'lucide-react';

import { formatAdDateTime } from '@/lib/format/date';
import type { DeployView } from '@/lib/projects/bundle';

/**
 * The site's latest production deploys, newest first — each one a new version
 * the client can see in the preview. Recorded from Vercel's webhook.
 */
export function DeployList({ deploys }: { deploys: DeployView[] }) {
  if (deploys.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No updates yet. Each new version of the site will be listed here.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {deploys.map((d) => (
        <li key={d.id} className="flex gap-2.5 text-sm">
          <Rocket
            className="mt-0.5 size-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{d.summary || 'New version'}</p>
            <p className="text-xs text-muted-foreground">
              {formatAdDateTime(d.deployedAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
