import { MapPin } from 'lucide-react';

import { AddToBasket } from './cart';
import { rupees, type Tea } from './catalogue';
import { TeaTin } from './tea-tin';

/** One tea: its tin on a wash of its own colour, notes, garden and price. */
export function TeaCard({ tea }: { tea: Tea }) {
  return (
    <article className="ht-reveal group flex flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.06),0_20px_40px_-28px_rgba(27,26,23,0.35)] ring-1 ring-[#1b1a17]/6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(27,26,23,0.06),0_30px_50px_-28px_rgba(27,26,23,0.45)]">
      <div
        className="relative grid h-56 place-items-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 70%, ${tea.tin.body}33, ${tea.tin.body}12 60%, transparent)`,
        }}
      >
        <span className="absolute left-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#1b1a17]/70 backdrop-blur">
          {tea.kind}
        </span>
        <TeaTin
          tea={tea}
          className="h-44 w-auto transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-3"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-tea)] text-[22px] leading-tight">
          {tea.name}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#1b1a17]/65">
          {tea.notes}
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-[#1b1a17]/55">
          <MapPin className="size-3.5" aria-hidden="true" />
          {tea.garden}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="whitespace-nowrap">
            <span className="text-lg font-semibold tabular-nums">
              {rupees(tea.price)}
            </span>
            <span className="text-xs text-[#1b1a17]/55"> / 100 g</span>
          </p>
          <AddToBasket tea={tea} />
        </div>
      </div>
    </article>
  );
}
