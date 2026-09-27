import type { Ref } from 'react';

import { WorkAvatar } from './work-avatar';

/**
 * The developer's pointer, with its name tag underneath. `LiveBuild` moves the
 * outer element straight to each region being built (a transform, eased in
 * CSS); inside it drifts on its own loop and clicks each time it arrives.
 */
export function LiveBuildCursor({
  ref,
  clickKey,
}: {
  ref: Ref<HTMLDivElement>;
  /** Changes on every scene, replaying the click. */
  clickKey: string;
}) {
  return (
    <div
      ref={ref}
      className="build-cursor pointer-events-none absolute left-0 top-0 z-30"
      style={{ transform: 'translate3d(55%, 45%, 0)' }}
    >
      <div
        className="cursor-wander"
        style={{ '--wander': '6.5s' } as React.CSSProperties}
      >
        <span className="relative block">
          <span
            key={clickKey}
            className="build-click absolute -left-3 -top-3 size-7 rounded-full border-2 border-emerald-500"
          />
          <svg
            viewBox="0 0 20 20"
            className="relative size-6 drop-shadow-[0_3px_6px_rgba(15,23,42,0.35)]"
          >
            <path
              d="M3 2.5 17 9l-6.2 1.9L8.6 17z"
              fill="#0f172a"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="ml-4 mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 py-1 pl-1 pr-3 text-[11.5px] font-semibold text-white shadow-lg shadow-emerald-900/25">
          <WorkAvatar who="engineer" className="size-5" />
          Developer
        </span>
      </div>
    </div>
  );
}
