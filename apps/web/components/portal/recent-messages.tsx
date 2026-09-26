import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';

import { PersonAvatar } from '@/components/projects/person-avatar';
import { formatAdDateTime } from '@/lib/format/date';
import type { RecentMessage } from '@/lib/portal/queries';

import { SectionCard } from './section-card';

/** The last few messages across every project, each linking to its thread. */
export function RecentMessages({ messages }: { messages: RecentMessage[] }) {
  return (
    <SectionCard
      icon={MessagesSquare}
      tone="sky"
      title="Latest messages"
      bodyClassName="px-3 pb-3"
    >
      {messages.length === 0 ? (
        <p className="px-2 pb-2 text-sm text-muted-foreground">
          No messages yet. Each project has its own thread.
        </p>
      ) : (
        <ul className="space-y-1">
          {messages.map((m) => (
            <li key={m.id}>
              <Link
                href={`/projects/${m.projectId}#messages`}
                className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-sky-500/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <PersonAvatar
                  name={m.authorName}
                  softmato={m.author === 'admin'}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{m.authorName}</span>
                    <time
                      dateTime={m.createdAt.toISOString()}
                      className="shrink-0 text-muted-foreground"
                    >
                      {formatAdDateTime(m.createdAt)}
                    </time>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-foreground/85">
                    {m.body}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {m.projectName}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
