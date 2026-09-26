'use client';

import { createContext, use, useEffect, useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';

import { cn } from '@/lib/cn';

import { TEAS, rupees, type Tea } from './catalogue';
import { TeaTin } from './tea-tin';

type Lines = Record<string, number>;

const CartContext = createContext<{
  lines: Lines;
  open: boolean;
  add: (id: string) => void;
  change: (id: string, by: number) => void;
  setOpen: (open: boolean) => void;
} | null>(null);

/** The preview's basket. In memory only — the preview takes no orders. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Lines>({});
  const [open, setOpen] = useState(false);

  const change = (id: string, by: number) =>
    setLines((now) => {
      const next = { ...now, [id]: Math.max(0, (now[id] ?? 0) + by) };
      if (next[id] === 0) delete next[id];
      return next;
    });

  return (
    <CartContext
      value={{ lines, open, setOpen, change, add: (id) => change(id, 1) }}
    >
      {children}
    </CartContext>
  );
}

export function useCart() {
  const cart = use(CartContext);
  if (!cart) throw new Error('useCart outside CartProvider');
  return cart;
}

export function CartButton() {
  const { lines, setOpen } = useCart();
  const count = Object.values(lines).reduce((n, q) => n + q, 0);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative grid size-10 place-items-center rounded-full bg-[var(--ht-green)] text-[var(--ht-cream)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ht-amber)]/50"
      aria-label={`Basket, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingBag className="size-[18px]" aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[var(--ht-amber)] px-1 text-[11px] font-semibold text-white ring-2 ring-[var(--ht-cream)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function AddToBasket({
  tea,
  className,
}: {
  tea: Tea;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        add(tea.id);
        setAdded(true);
      }}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ht-amber)]/50',
        added
          ? 'bg-[var(--ht-amber)] text-white'
          : 'bg-[var(--ht-green)] text-[var(--ht-cream)] hover:bg-[#173022]',
        className,
      )}
    >
      {added ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Plus className="size-4" aria-hidden="true" />
      )}
      {added ? 'Added' : 'Add'}
      <span className="sr-only"> {tea.name} to basket</span>
    </button>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, change } = useCart();
  const items = TEAS.filter((t) => lines[t.id]);
  const total = items.reduce((n, t) => n + t.price * (lines[t.id] ?? 0), 0);
  const [checkedOut, setCheckedOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-40',
        open ? 'visible' : 'invisible delay-300',
      )}
      aria-hidden={!open}
    >
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'absolute inset-0 bg-[#1b1a17]/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-label="Basket"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[var(--ht-cream)] shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-[#1b1a17]/10 px-5 py-4">
          <p className="font-[family-name:var(--font-tea)] text-xl">
            Your basket
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close basket"
            className="grid size-9 place-items-center rounded-full hover:bg-[#1b1a17]/5"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[#1b1a17]/60">
              Nothing here yet — add a tea you like.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((tea) => (
                <li key={tea.id} className="flex items-center gap-3">
                  <TeaTin tea={tea} className="h-16 w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{tea.name}</p>
                    <p className="text-xs text-[#1b1a17]/60">
                      100 g tin · {rupees(tea.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white px-1 py-1 shadow-sm">
                    <button
                      type="button"
                      aria-label={`One less ${tea.name}`}
                      onClick={() => change(tea.id, -1)}
                      className="grid size-7 place-items-center rounded-full hover:bg-[#1b1a17]/5"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm tabular-nums">
                      {lines[tea.id]}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more ${tea.name}`}
                      onClick={() => change(tea.id, 1)}
                      className="grid size-7 place-items-center rounded-full hover:bg-[#1b1a17]/5"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-[#1b1a17]/10 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[#1b1a17]/70">Subtotal</span>
            <span className="text-lg font-semibold tabular-nums">
              {rupees(total)}
            </span>
          </div>
          {checkedOut ? (
            <p
              role="status"
              className="mt-3 rounded-2xl bg-white p-3 text-[13px] leading-relaxed text-[#1b1a17]/80 shadow-sm"
            >
              In the finished shop this opens checkout with eSewa, Khalti,
              Fonepay or a card. This preview places no orders.
            </p>
          ) : null}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setCheckedOut(true)}
            className="mt-3 h-12 w-full rounded-full bg-[var(--ht-amber)] font-medium text-white transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            Checkout
          </button>
        </footer>
      </aside>
    </div>
  );
}
