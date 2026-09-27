import {
  DatabaseBackup,
  Globe,
  LifeBuoy,
  RefreshCw,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * What happens after launch, on any plan. Each line restates the founder's
 * own words on `/how-we-work` ("we keep hosting the site, renew the domain
 * and maintain the software we built for you") or the maintenance service's
 * copy — offered, not bundled, so nothing here reads as part of a price.
 */
const CARE: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Globe,
    title: 'Domain',
    body: 'Registered in your name or ours, and renewed on time.',
  },
  {
    icon: Server,
    title: 'Hosting',
    body: 'Hosting with an SSL certificate, set up and looked after.',
  },
  {
    icon: RefreshCw,
    title: 'Updates',
    body: 'Framework and library updates, tested before they go live.',
  },
  {
    icon: ShieldCheck,
    title: 'Security patches',
    body: 'Security fixes applied when they are released.',
  },
  {
    icon: DatabaseBackup,
    title: 'Backups',
    body: 'Backups checked by restoring them, not just by taking them.',
  },
  {
    icon: LifeBuoy,
    title: 'Support',
    body: 'One team to call when something needs fixing or changing.',
  },
];

export function PlanCare() {
  return (
    <section aria-labelledby="plan-care" className="mt-24">
      <h2
        id="plan-care"
        className="headline text-center text-[clamp(1.6rem,3.4vw,2.2rem)]"
      >
        After launch, on every plan
      </h2>
      <p className="mx-auto mt-3 max-w-[52ch] text-center text-[16px] text-foreground/75">
        If you want one team to look after it, we keep your website or app
        running.
      </p>

      <ul className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:-mx-4 lg:grid-cols-3 xl:-mx-20">
        {CARE.map(({ icon: Icon, title, body }) => (
          <li key={title} className="bg-card p-6">
            <Icon className="size-5 text-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-[16px] font-semibold">{title}</h3>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-foreground/75">
              {body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
