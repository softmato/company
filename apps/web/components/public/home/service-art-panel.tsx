import { Tilt } from '@/components/motion/tilt';
import { RippleAsset } from '@/components/three/ripple-asset';
import type { ServiceArt } from '@/lib/home/service-art';

/**
 * The picture for one service: its rendered illustration on a soft stage,
 * signed with the Softmato mark. The panel is the brand's, the scene is the
 * service's — so three panels read as one company's three kinds of work.
 *
 * The scene leans toward the pointer (`Tilt`) and ripples under it
 * (`RippleAsset`); both are mouse-only, so on a phone it is a still picture.
 * It is sized in container units (`.service-panel` is a size container) so a
 * wide scene and a tall one both fill the stage without overflowing it.
 *
 * Decorative: the step beside it names the service and says what it involves.
 */
export function ServiceArtPanel({ art }: { art: ServiceArt }) {
  return (
    <div className="service-panel" aria-hidden="true">
      <Tilt className="absolute inset-0 grid place-items-center">
        <RippleAsset
          src={art.src}
          width={art.width}
          height={art.height}
          className="relative"
          style={{ width: `min(90cqw, calc(78cqh * ${art.width / art.height}))` }}
        />
      </Tilt>

      <span className="service-panel__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" className="size-4 object-contain" />
        softmato
      </span>
    </div>
  );
}
