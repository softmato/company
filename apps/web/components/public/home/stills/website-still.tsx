import { StillFrame } from './still-frame';

/**
 * A browser window, drawn. The still for web application work.
 *
 * **Browser chrome carries the whole message.** The drawing this replaced put a
 * desktop panel and a phone in one frame, which was meant to say "we do both"
 * and instead said neither clearly — and now that apps are their own service
 * with their own still, the two have to be told apart at a glance. A window bar
 * with a URL in it is unmistakably a website; a phone outline is unmistakably an
 * app. Nothing else in either drawing has to work as hard.
 *
 * The URL is `softmato.com`, not a client's. Putting a plausible customer domain
 * in a drawing on our own home page is a claim about who we work for.
 *
 * Everything is `aria-hidden` via `StillFrame`: this is a drawing, not a
 * screenshot.
 */
function Bar({ w, strong = false }: { w: string; strong?: boolean }) {
  return (
    <div
      className={`h-2 rounded-full ${strong ? 'bg-foreground/70' : 'bg-foreground/12'}`}
      style={{ width: w }}
    />
  );
}

export function WebsiteStill() {
  return (
    <StillFrame>
      <div className="still overflow-hidden">
        {/* The window bar. Three dots and an address, and it is a browser. */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-foreground/15" />
            <span className="size-2 rounded-full bg-foreground/15" />
            <span className="size-2 rounded-full bg-foreground/15" />
          </div>
          <div className="numeric flex-1 rounded-full bg-card px-3 py-1 text-[10px] text-muted-foreground">
            softmato.com
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between">
            <Bar w="26%" strong />
            <div className="flex gap-2">
              <span className="h-1.5 w-8 rounded-full bg-foreground/12" />
              <span className="h-1.5 w-8 rounded-full bg-foreground/12" />
              <span className="h-1.5 w-8 rounded-full bg-foreground/12" />
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <Bar w="72%" strong />
            <Bar w="88%" />
            <Bar w="64%" />
          </div>

          <div className="mt-4 h-7 w-28 rounded-full bg-primary" />

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((cell) => (
              <div
                key={cell}
                className="space-y-2 rounded-lg bg-surface-strong p-3"
              >
                <div className="size-5 rounded-md bg-primary/30" />
                <Bar w="82%" />
                <Bar w="58%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </StillFrame>
  );
}
