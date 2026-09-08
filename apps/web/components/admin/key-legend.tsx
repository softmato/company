/**
 * "What these keys are" — one rail, at the right of the page, said once.
 *
 * The panel used to explain each key beside the key, in a second column inside
 * every row. With two credential sets on screen that is the same six sentences
 * printed twice, wrapped to a narrow column, competing with the values they
 * describe — and the values are what an admin actually came for.
 *
 * So the explanation leaves the rows entirely and becomes reference material,
 * parked where this codebase already parks reference material: the `TocRail`
 * pattern from the legal and `/developers` pages, sticky at the top right,
 * plain text on the page ground with no frame. A card in the margin reads as a
 * second piece of content; this should read as a margin note.
 *
 * It is deliberately short to the point of being blunt. Anything that needs a
 * paragraph belongs in `docs/INTEGRATION.md`, which is linked from the bottom.
 *
 * **The Sandbox sentence is here rather than nowhere.** The plan requires the
 * page to state, in the admin's own words, that a Sandbox credential is not an
 * isolation boundary — `mode` picks an identifier prefix and nothing else, and
 * `PAYMENT_MODE` is what decides whether money is real. The banner that used
 * to carry it was removed for being noise, which it was; the claim it made is
 * still true and still the most expensive thing on this page to get wrong, so
 * it moved rather than went.
 */
const KEYS = [
  {
    name: 'Client id',
    note: 'Public. Names the application. Already in every request.',
  },
  {
    name: 'Client secret',
    note: 'Your server → us. Argon2id-hashed, so never shown twice. Lost one is rotated.',
  },
  {
    name: 'Signing secret',
    note: 'Us → your server. Check it over the raw body before reading a field.',
  },
] as const;

export function KeyLegend() {
  return (
    <aside
      aria-label="What these keys are"
      className="sticky top-16 hidden text-xs lg:block"
    >
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        The keys
      </p>

      <dl className="mt-3 space-y-3">
        {KEYS.map((key) => (
          <div key={key.name}>
            <dt className="font-medium">{key.name}</dt>
            <dd className="mt-0.5 text-muted-foreground">{key.note}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Webhook URL
      </p>

      <p className="mt-3 text-muted-foreground">
        Where we POST signed events. Its hostname must be on that
        credential&rsquo;s domain list — our server fetches it, so an address we
        have not been told to trust is not one we will call. Sandbox and
        Production have separate lists.
      </p>

      <p className="mt-6 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Sandbox
      </p>

      <p className="mt-3 text-muted-foreground">
        A label on the identifier, not an isolation boundary. Used against
        production it takes real money. Only a non-production deployment, with
        its own <code className="font-mono">PAYMENT_MODE</code>, keeps a payment
        from being real.
      </p>
    </aside>
  );
}
