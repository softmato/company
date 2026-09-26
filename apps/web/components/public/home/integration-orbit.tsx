import { OrbitingCircles } from '@/components/motion/orbiting-circles';

import { INTEGRATION_ICONS } from './integration-icons';

/* Every mark appears once: the apps outside, the AI models close in. */
const OUTER = ['whatsapp', 'notion', 'googleDrive', 'gitHub'] as const;
const INNER = ['openai', 'claude', 'grok', 'gemini'] as const;

/**
 * Softmato in the middle, the apps a product gets wired into circling it: two
 * rings in opposite directions so the eye never finds a resting point. Each
 * mark sits on a white chip so the black ones (Notion, GitHub) read on the
 * card and the coloured ones read as the same family.
 */
export function IntegrationOrbit() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 flex h-[72%] items-center justify-center [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]"
    >
      <div className="z-10 flex size-14 items-center justify-center rounded-full border border-border bg-card p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/mark.png"
          alt=""
          className="size-full object-contain"
        />
      </div>

      <OrbitingCircles iconSize={42} radius={100} duration={28}>
        {OUTER.map((name, i) => (
          <Chip key={i} name={name} />
        ))}
      </OrbitingCircles>
      <OrbitingCircles iconSize={32} radius={54} duration={18} reverse>
        {INNER.map((name, i) => (
          <Chip key={i} name={name} />
        ))}
      </OrbitingCircles>
    </div>
  );
}

function Chip({ name }: { name: keyof typeof INTEGRATION_ICONS }) {
  const Icon = INTEGRATION_ICONS[name];
  return (
    <span className="flex size-full items-center justify-center rounded-full border border-border bg-card p-[22%] text-foreground shadow-[0_6px_16px_-10px_rgba(0,0,0,0.4)]">
      <Icon />
    </span>
  );
}
