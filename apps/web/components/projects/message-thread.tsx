import { MessagesSquare } from 'lucide-react';

import { formatAdDateTime } from '@/lib/format/date';
import { cn } from '@/lib/cn';
import type { MessageView } from '@/lib/projects/bundle';

import { PersonAvatar } from './person-avatar';

/**
 * A project's conversation, oldest first. The viewer's own side sits on the
 * right, as in every messaging app a client already uses.
 */
export function MessageThread({
  messages,
  side,
}: {
  messages: MessageView[];
  side: 'client' | 'admin';
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-sky-500/5 px-4 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/12 text-sky-600">
          <MessagesSquare className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-medium">No messages yet</p>
        <p className="mt-1 max-w-[40ch] text-[13px] text-muted-foreground">
          Questions, feedback and decisions about this project go here, where
          everyone on it can see them.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const mine = m.author === side;
        const softmato = m.author === 'admin';

        return (
          <li
            key={m.id}
            className={cn('flex gap-2.5', mine && 'flex-row-reverse')}
          >
            <PersonAvatar
              name={m.authorName}
              softmato={softmato}
              className="mt-5"
            />

            <div className={cn('min-w-0 max-w-[82%]', mine && 'text-right')}>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.authorName}
                </span>
                {softmato ? (
                  <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10.5px] font-medium text-emerald-700">
                    Softmato
                  </span>
                ) : null}{' '}
                ·{' '}
                <time dateTime={m.createdAt.toISOString()}>
                  {formatAdDateTime(m.createdAt)}
                </time>
              </p>
              <p
                className={cn(
                  'mt-1 inline-block whitespace-pre-line rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed [overflow-wrap:anywhere]',
                  mine
                    ? 'rounded-tr-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'rounded-tl-sm bg-muted text-foreground',
                )}
              >
                {m.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
