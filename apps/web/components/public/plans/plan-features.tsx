import Link from 'next/link';
import { Check, type LucideIcon } from 'lucide-react';

/** A plan line, with its one optional `[label](/path)` set as a link. */
function FeatureText({ text }: { text: string }) {
  const match = /\[([^\]]+)\]\(([^)]+)\)/.exec(text);
  if (!match) return <>{text}</>;

  return (
    <span>
      {text.slice(0, match.index)}
      <Link
        href={match[2]!}
        className="font-medium underline decoration-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground"
      >
        {match[1]}
      </Link>
      {text.slice(match.index + match[0].length)}
    </span>
  );
}

/**
 * One labelled group of a plan's lines — Website, App, or both — so a reader
 * looking only at apps can skip straight to their half of every card.
 */
export function PlanFeatures({
  icon: Icon,
  label,
  items,
}: {
  icon: LucideIcon;
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-2.5 text-[14px] font-semibold text-foreground">
        <span className="grid size-7 place-items-center rounded-lg bg-muted ring-1 ring-border">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {label}
      </p>

      <ul className="mt-3.5 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-[14.5px] leading-snug text-foreground"
          >
            <Check
              className="mt-0.5 size-4 flex-none text-foreground/55"
              aria-hidden="true"
            />
            <FeatureText text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
