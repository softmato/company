'use client';

/**
 * Status tabs and a search box, both driven through the URL.
 *
 * The screens this replaces filtered a hardcoded array in React state. That
 * works for five rows and stops working for the first real page of them: the
 * client would have to hold every transaction ever made in memory to filter
 * it. Putting the filter in the query string moves the work to SQL, and gives
 * the admin a URL they can bookmark or send to someone — "the four payments
 * held for review" becomes a link.
 *
 * `useTransition` keeps the controls responsive while the server re-renders,
 * and `replace` rather than `push` keeps the back button meaning "the previous
 * page" rather than "the previous filter I tried".
 */
import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface TableFiltersProps {
  /** Status values to offer. `all` is added automatically. */
  statuses: readonly string[];
  searchPlaceholder: string;
}

export function TableFilters({ statuses, searchPlaceholder }: TableFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = params.get('status') ?? 'all';

  function apply(next: Record<string, string>): void {
    const updated = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all') updated.set(key, value);
      else updated.delete(key);
    }

    // A filter change means a different result set, so any page position in
    // the old one is meaningless.
    updated.delete('page');

    startTransition(() => {
      router.replace(`${pathname}?${updated}`, { scroll: false });
    });
  }

  return (
    <div
      className={`flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center ${
        pending ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {['all', ...statuses].map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={active === status}
            onClick={() => apply({ status })}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              active === status
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/*
        A form, so Enter submits and the field is not a controlled input firing
        a server round trip per keystroke.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get('q');
          apply({ q: typeof value === 'string' ? value.trim() : '' });
        }}
      >
        <input
          type="search"
          name="q"
          defaultValue={params.get('q') ?? ''}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
        />
      </form>
    </div>
  );
}
