import type { CSSProperties } from 'react';

import { Tilt } from '@/components/motion/tilt';
import type { TrustedArt } from '@/lib/home/trusted-art';
import type { OWN_PRODUCTS } from '@/lib/home/how-we-work';

export type TrustedName = (typeof OWN_PRODUCTS)[number];

export type TrustedSlot = { name: TrustedName } | { art: TrustedArt };

/**
 * One tile on the wall: a name and its mark on white, or a 3D icon on a
 * coloured ground. The picture sits forward of the tile in 3D, so when the
 * tile leans toward the pointer the picture parallaxes against it.
 */
export function TrustedTile({ slot }: { slot: TrustedSlot }) {
  return (
    <Tilt max={14} className="[transform-style:preserve-3d]">
      {'name' in slot ? (
        <div className="trusted-tile trusted-filled">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.name.src}
            alt=""
            width={Math.round(64 * slot.name.ratio)}
            height={64}
            loading="lazy"
            decoding="async"
            className="trusted-pop h-auto max-h-[40%] w-[58%] object-contain"
          />
          <span className="trusted-pop sr-only text-[12px] font-semibold text-foreground sm:not-sr-only">
            {slot.name.name}
          </span>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="trusted-tile trusted-art"
          style={{ '--tint': slot.art.tint } as CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.art.src}
            alt=""
            width={240}
            height={240}
            loading="lazy"
            decoding="async"
            className="trusted-pop h-auto max-h-[70%] w-[74%] object-contain"
          />
        </div>
      )}
    </Tilt>
  );
}
