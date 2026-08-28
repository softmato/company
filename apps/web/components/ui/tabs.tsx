'use client';

import { useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Tabs (docs/handoff/UI_HANDOFF.md §4): `h-9` list on a muted ground with a
 * 3px inset; the active trigger is white with a soft shadow.
 *
 * Arrow-key roving focus is implemented here because the ARIA tabs pattern
 * requires it — with plain buttons, Tab lands on every trigger in turn, and a
 * keyboard user has to walk through all of them to reach the panel.
 */
export function Tabs({
  tabs,
  className,
}: {
  tabs: Array<{ label: string; content: React.ReactNode }>;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;

    event.preventDefault();
    const next = (active + delta + tabs.length) % tabs.length;

    setActive(next);
    listRef.current?.querySelectorAll('button')[next]?.focus();
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-[3px]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn(
              'h-full rounded-md px-3 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              index === active
                ? 'bg-background text-foreground shadow-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== active}
          className="mt-4"
        >
          {index === active ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
