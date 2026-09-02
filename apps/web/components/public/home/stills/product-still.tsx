import { StillFrame } from './still-frame';

/**
 * A running application, drawn. The still for product engineering.
 *
 * **This replaced a drawing of a journal entry.** A balanced ledger is a true
 * picture of what this company cares about and a poor picture of *product
 * engineering*, which is the service that takes an idea to something people pay
 * for. The picture for that is the thing you end up with: a product with a
 * sidebar, a shape going up, and rows somebody works through. The ledger's job —
 * showing that we build systems where being wrong has a cost — belongs to the
 * custom rung of the scope ladder, not here.
 *
 * **It carries no figures and no names, and that is not squeamishness.** The
 * first draft of this drawing said "Active subscriptions · 24" over rows named
 * "Sunrise Hostel" and "Everest Boys". Every other still on this page has
 * numbers in it and they are fine, because an amount on a drawn invoice is
 * plainly the screen's own datum. A count of active subscriptions on the home
 * page of the company that sells HostelHub is not: it reads as *our* customer
 * count, and the named rows read as *our* clients. The line is whether a reader
 * would take the number as a fact about this business — see the standing rule in
 * `docs/reference/README.md`. Bars carry the same composition and claim nothing.
 *
 * Bigger elements than the drawing it replaced, too. At the size this panel is
 * shown, a four-column table of 11px figures is texture rather than a screen.
 *
 * Everything is `aria-hidden` via `StillFrame`: this is a drawing, not data.
 */

/** Monthly bars. The shape is drawn, not measured — see the note above. */
const BARS = [38, 46, 42, 58, 66, 61, 78, 88];

/** Row widths and whether the row carries an "active" chip. */
const ROWS = [
  { w: '58%', active: true },
  { w: '46%', active: true },
  { w: '64%', active: false },
];

export function ProductStill() {
  return (
    <StillFrame>
      <div className="still overflow-hidden">
        <div className="flex">
          {/* Sidebar. Enough of one to say "this is an application". */}
          <div className="hidden w-[26%] flex-none border-r border-border bg-surface p-4 sm:block">
            <div className="flex items-center gap-2">
              <span className="size-4 rounded-md bg-primary" />
              <span className="h-2 w-12 rounded-full bg-foreground/20" />
            </div>

            <div className="mt-6 space-y-2.5">
              {[true, false, false, false].map((active, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                    active ? 'bg-primary/10' : ''
                  }`}
                >
                  <span
                    className={`size-2.5 rounded-sm ${
                      active ? 'bg-primary' : 'bg-foreground/15'
                    }`}
                  />
                  <span
                    className={`h-1.5 rounded-full ${
                      active ? 'w-10 bg-primary/60' : 'w-8 bg-foreground/12'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1 p-5">
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-24 rounded-full bg-foreground/70" />
              <span className="h-6 w-16 rounded-full bg-primary" />
            </div>

            {/*
              A bar chart drawn with flex children, not a chart library.
              Importing a charting runtime to draw eight rectangles on a
              marketing page is a bundle for a picture.
            */}
            <div className="mt-6 flex h-20 items-end gap-1.5">
              {BARS.map((height, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-sm ${
                    index === BARS.length - 1 ? 'bg-primary' : 'bg-primary/25'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className="mt-6 space-y-1 border-t border-border pt-4">
              {ROWS.map((row, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <span className="size-6 flex-none rounded-full bg-surface-strong" />
                  <span
                    className="h-2 rounded-full bg-foreground/15"
                    style={{ width: row.w }}
                  />
                  <span
                    className={`ml-auto h-4 w-10 flex-none rounded-full ${
                      row.active ? 'bg-primary/20' : 'bg-surface-strong'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StillFrame>
  );
}
