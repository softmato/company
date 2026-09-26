'use client';

import { useState } from 'react';
import { CircleCheckBig, Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/cn';

import { TEAS, rupees } from './catalogue';
import { TeaTin } from './tea-tin';

/** The minimum a wholesale order may be — the sample client asked for this in their portal thread. */
const MINIMUM_CARTONS = 10;
const VAT = 0.13;

/**
 * The buyer's own price list, ordered by the carton. Everything is local: the
 * preview shows what the finished page does, and sends nothing anywhere.
 */
export function WholesaleOrder() {
  const [cartons, setCartons] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);

  const total = TEAS.reduce((n, t) => n + (cartons[t.id] ?? 0), 0);
  const subtotal = TEAS.reduce(
    (n, t) => n + t.carton * (cartons[t.id] ?? 0),
    0,
  );
  const vat = Math.round(subtotal * VAT);
  const short = MINIMUM_CARTONS - total;

  const set = (id: string, by: number) => {
    setSent(false);
    setCartons((now) => ({ ...now, [id]: Math.max(0, (now[id] ?? 0) + by) }));
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_40px_-30px_rgba(27,26,23,0.4)] ring-1 ring-[#1b1a17]/6">
        <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_8.5rem] gap-4 border-b border-[#1b1a17]/8 px-5 py-3 text-xs font-medium uppercase tracking-wider text-[#1b1a17]/50 md:grid">
          <span>Tea</span>
          <span className="text-right">Retail / tin</span>
          <span className="text-right">Your carton</span>
          <span className="text-center">Cartons</span>
        </div>
        <ul className="divide-y divide-[#1b1a17]/6">
          {TEAS.map((tea) => {
            const qty = cartons[tea.id] ?? 0;
            const saving = Math.round(
              (1 - tea.carton / (tea.price * 20)) * 100,
            );

            return (
              <li
                key={tea.id}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_7rem_7rem_8.5rem]',
                  qty > 0 && 'bg-[#f4efe2]',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TeaTin tea={tea} className="h-12 w-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tea.name}</p>
                    <p className="text-xs text-[#1b1a17]/55">
                      20 × 100 g ·{' '}
                      <span className="font-medium text-[var(--ht-leaf)]">
                        {saving}% off retail
                      </span>
                      <span className="md:hidden"> · {rupees(tea.carton)}</span>
                    </p>
                  </div>
                </div>
                <span className="hidden text-right text-sm tabular-nums text-[#1b1a17]/55 md:block">
                  {rupees(tea.price)}
                </span>
                <span className="hidden text-right font-semibold tabular-nums md:block">
                  {rupees(tea.carton)}
                </span>
                <div className="flex items-center justify-center gap-1 justify-self-end rounded-full bg-[var(--ht-cream)] p-1 md:justify-self-center">
                  <button
                    type="button"
                    aria-label={`One carton fewer of ${tea.name}`}
                    onClick={() => set(tea.id, -1)}
                    className="grid size-8 place-items-center rounded-full hover:bg-white"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center font-medium tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`One carton more of ${tea.name}`}
                    onClick={() => set(tea.id, 1)}
                    className="grid size-8 place-items-center rounded-full bg-[var(--ht-green)] text-white hover:bg-[#173022]"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="rounded-[28px] bg-[#16301f] p-6 text-[#e9e2d2] shadow-xl lg:sticky lg:top-24">
        <p className="font-[family-name:var(--font-tea)] text-2xl">
          Order summary
        </p>
        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#e9e2d2]/70">Cartons</dt>
            <dd className="tabular-nums">{total}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#e9e2d2]/70">Subtotal</dt>
            <dd className="tabular-nums">{rupees(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#e9e2d2]/70">VAT 13%</dt>
            <dd className="tabular-nums">{rupees(vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
            <dt>Total</dt>
            <dd className="tabular-nums">{rupees(subtotal + vat)}</dd>
          </div>
        </dl>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c9e3b1] to-[var(--ht-amber)] transition-[width] duration-500"
            style={{
              width: `${Math.min(100, (total / MINIMUM_CARTONS) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[#e9e2d2]/70">
          {short > 0
            ? `Minimum order is ${MINIMUM_CARTONS} cartons — ${short} to go.`
            : 'Minimum reached. Delivered in 3–5 days, invoiced with your PAN.'}
        </p>

        {sent ? (
          <p
            role="status"
            className="mt-5 flex gap-2 rounded-2xl bg-white/10 p-3 text-[13px] leading-relaxed text-[#e9e2d2]"
          >
            <CircleCheckBig
              className="mt-0.5 size-4 shrink-0 text-[#c9e3b1]"
              aria-hidden="true"
            />
            In the finished site this order reaches the tea company with its
            invoice attached. This preview sends nothing.
          </p>
        ) : null}

        <button
          type="button"
          disabled={short > 0}
          onClick={() => setSent(true)}
          className="mt-5 h-12 w-full rounded-full bg-[var(--ht-amber)] font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45"
        >
          Send order
        </button>
      </aside>
    </div>
  );
}
