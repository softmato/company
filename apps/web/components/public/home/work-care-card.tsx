import { CareArt } from '@/components/public/care-art';
import { ElectricBorder } from '@/components/motion/electric-border';
import { CARE } from '@/lib/home/how-we-work';

/**
 * The centre of the horizon: what we keep doing once the software is live —
 * domain, hosting, updates, security, backups, support — each a care mark
 * with a tick. The headline's "long after it ships" as an object. The one lit
 * card in the composition, so it carries the electric border.
 */
export function WorkCareCard() {
  return (
    <ElectricBorder
      className="float-card w-[21rem] max-w-full p-5"
      color="var(--glow)"
      speed={0.5}
      chaos={0.07}
      borderRadius={20}
    >
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-foreground">{CARE.title}</p>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">
          <span className="live-dot size-1.5 rounded-full bg-primary" />
          {CARE.status}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2">
        {CARE.items.map((item) => (
          <li
            key={item.kind}
            className="relative flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-1 pb-2 pt-2.5"
          >
            <CareArt kind={item.kind} className="size-8 text-foreground" />
            <span className="text-[11.5px] font-medium text-foreground">
              {item.label}
            </span>
            <svg
              viewBox="0 0 16 16"
              className="absolute -right-1.5 -top-1.5 size-4"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7.5" fill="var(--primary)" />
              <path
                d="m4.8 8.2 2.1 2.1 4.2-4.4"
                fill="none"
                stroke="var(--primary-foreground)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </li>
        ))}
      </ul>
    </ElectricBorder>
  );
}
