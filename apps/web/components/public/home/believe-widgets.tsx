import Image from 'next/image';

import { BOXES, SHIELD_SRC, frameVars } from '@/lib/home/believe';

const PLACED = 'lg:absolute lg:left-[var(--fx)] lg:top-[var(--fy)] lg:w-[var(--fw)]';

/**
 * The headline as a control: "Looks right" switched off, "Is right" on.
 *
 * Ships in the finished state. The motion hook starts it the other way round
 * and flips it once the card has landed, so the switch is the one moment in
 * the section that says the sentence rather than illustrating it.
 */
export function ToggleWidget() {
  return (
    <div data-widget="" data-step="" className={PLACED} style={frameVars(BOXES.toggle)}>
      <div className="believe-float section-frame space-y-3 p-4">
        <ToggleRow label="Looks right" name="looks" on={false} />
        <div className="h-px bg-border" />
        <ToggleRow label="Is right" name="is" on />
      </div>
    </div>
  );
}

function ToggleRow({ label, name, on }: { label: string; name: string; on: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-none">{label}</p>
        <span
          aria-hidden="true"
          className={`mt-2 block h-1.5 rounded-full ${on ? 'w-20 bg-primary/50' : 'w-12 bg-surface-strong'}`}
        />
      </div>
      <span
        role="img"
        aria-label={on ? 'On' : 'Off'}
        className="relative h-5 w-9 shrink-0 rounded-full bg-surface-strong"
      >
        <span
          data-fill={name}
          className="absolute inset-0 rounded-full bg-primary"
          style={{ opacity: on ? 1 : 0 }}
        />
        <span
          data-knob={name}
          className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm"
          style={{ transform: `translateX(${on ? 16 : 0}px)` }}
        />
      </span>
    </div>
  );
}

/** "Correctness is not a feature", as the reference's protection badge. */
export function ShieldWidget() {
  return (
    <div data-widget="" data-step="" className={PLACED} style={frameVars(BOXES.shield)}>
      <div className="believe-float section-frame p-4 [animation-delay:-3s]">
        <p className="flex items-center gap-2 text-[12.5px] font-medium">
          <span aria-hidden="true" className="size-2 rounded-full bg-glow" />
          Enforced, not remembered
        </p>
        <div className="believe-dots relative mt-3 grid h-32 place-items-center rounded-lg">
          <span aria-hidden="true" className="believe-glow absolute inset-0 rounded-lg" />
          <Image
            src={SHIELD_SRC}
            alt=""
            width={80}
            height={80}
            sizes="80px"
            className="relative size-20"
          />
        </div>
      </div>
    </div>
  );
}
