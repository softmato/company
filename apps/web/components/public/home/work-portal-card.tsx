import { PORTAL } from '@/lib/home/how-we-work';
import { cn } from '@/lib/cn';

import { WorkAvatar } from './work-avatar';

const GLYPH = {
  web: 'M3 5h18v14H3zM3 9h18M6 7h.01M8.5 7h.01',
  app: 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM11 18.5h2',
} as const;

/**
 * The client portal, drawn: a browser window at agency.softmato.com with
 * every project the client has with us, each at its stage, and the
 * engineer's latest update landing at the foot of it.
 *
 * Read in a glance, the way UI_BRIEF §3.4 asks of the portal itself ("where
 * the project is in five seconds"): a bar per project, the stage beside it,
 * and one notice. The bars fill as the card scrolls into view
 * (`.portal-bar` in marketing.css), where the browser can link an animation
 * to the scroll; elsewhere they simply show full.
 */
export function WorkPortalCard() {
  return (
    <div className="float-card w-[23rem] max-w-full overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3.5 py-2.5">
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
        </span>
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-card py-1 text-[11.5px] text-muted-foreground">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            className="size-3"
            aria-hidden="true"
          >
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          {PORTAL.url}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-foreground">
            {PORTAL.title}
          </p>
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary">
            <span className="live-dot size-1.5 rounded-full bg-primary" />
            Live updates
          </span>
        </div>

        <ul className="mt-3 space-y-3">
          {PORTAL.projects.map((project) => (
            <li key={project.name} className="flex items-center gap-3">
              <span className="grid size-8 flex-none place-items-center rounded-lg bg-surface text-primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d={GLYPH[project.kind]} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {project.name}
                  </span>
                  <span
                    className={cn(
                      'flex-none text-[11px] font-medium',
                      project.progress === 100
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    {project.stage}
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-strong">
                  <span
                    className="portal-bar block h-full rounded-full bg-primary"
                    style={{ width: `${project.progress}%` }}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-primary/8 p-2.5">
          <WorkAvatar who="engineer" className="size-8" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-foreground">
              {PORTAL.update.title}
            </span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {PORTAL.update.body}
            </span>
          </span>
          <span className="live-dot size-2 flex-none rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
