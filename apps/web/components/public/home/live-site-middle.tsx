'use client';

import {
  Bike,
  Check,
  Flame,
  Leaf,
  Milk,
  Plus,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { PHOTO, SITE } from '@/lib/home/live-build';

import { Block, Photo, Pop, Typed, useBuild } from './live-build-parts';

const STRIP_ICON: Record<(typeof SITE.strip)[number]['icon'], LucideIcon> = {
  leaf: Leaf,
  flame: Flame,
  milk: Milk,
  wifi: Wifi,
  bike: Bike,
};

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-600">
      {children}
    </p>
  );
}

/** Where a real site puts client logos: what the café does, bold and plain. */
export function SiteStrip() {
  const { at } = useBuild();

  return (
    <Block
      region="strip"
      shown={at('strip')}
      className="border-y border-slate-100 bg-white"
    >
      <ul className="mx-auto grid max-w-[64rem] grid-cols-2 gap-y-5 px-6 py-8 @2xl:grid-cols-5">
        {SITE.strip.map((item, i) => {
          const Icon = STRIP_ICON[item.icon];
          return (
            <Pop
              key={item.label}
              as="li"
              on={at('strip')}
              index={i}
              className="flex items-center justify-center gap-2 text-[15px] font-bold tracking-tight text-slate-900"
            >
              <Icon className="size-5" strokeWidth={2.25} />
              {item.label}
            </Pop>
          );
        })}
      </ul>
    </Block>
  );
}

export function SiteMenu() {
  const { at } = useBuild();

  return (
    <Block region="menu" shown={at('menu')} className="bg-white">
      <div className="mx-auto max-w-[64rem] px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Menu</Eyebrow>
            <p className="mt-2 text-[clamp(1.5rem,3.4cqi,2.3rem)] font-semibold tracking-tight text-slate-950">
              <Typed text="On the menu today" on={at('menu')} />
            </p>
          </div>
          <span className="flex gap-1 rounded-full bg-slate-100 p-1 text-[12.5px] font-medium">
            {SITE.menuTabs.map((tab, i) => (
              <span
                key={tab}
                className={cn(
                  'rounded-full px-4 py-1.5',
                  i === 0
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500',
                )}
              >
                {tab}
              </span>
            ))}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 @3xl:grid-cols-4">
          {SITE.menu.map((item, i) => (
            <Pop
              key={item.name}
              on={at('menu')}
              index={i + 1}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/80"
            >
              <div className="relative aspect-[4/3]">
                <Photo src={item.image} sizes="260px" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-900 backdrop-blur">
                  {item.price}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3.5">
                <span>
                  <span className="block text-[14px] font-semibold text-slate-900">
                    {item.name}
                  </span>
                  <span className="block text-[12px] text-slate-500">
                    {item.note}
                  </span>
                </span>
                <span className="grid size-8 flex-none place-items-center rounded-full bg-slate-900 text-white">
                  <Plus className="size-4" />
                </span>
              </div>
            </Pop>
          ))}
        </div>
      </div>
    </Block>
  );
}

export function SiteStory() {
  const { at } = useBuild();
  const on = at('story');

  return (
    <Block region="story" shown={on} className="bg-[#fbf6f0]">
      <div className="mx-auto grid max-w-[64rem] items-center gap-10 px-6 py-16 @3xl:grid-cols-2">
        <div className="relative h-[20rem] @3xl:h-[25rem]">
          <Pop
            on={on}
            className="absolute left-0 top-0 h-[78%] w-[70%] overflow-hidden rounded-3xl shadow-xl"
          >
            <Photo src={PHOTO.interior} />
          </Pop>
          <Pop
            on={on}
            index={1}
            className="absolute bottom-0 right-0 h-[58%] w-[52%] overflow-hidden rounded-3xl shadow-xl ring-8 ring-[#fbf6f0]"
          >
            <Photo src={PHOTO.counter} sizes="300px" />
          </Pop>
          <Pop
            on={on}
            index={2}
            className="absolute bottom-[10%] left-[4%] flex items-center gap-2.5 rounded-2xl bg-white p-3 pr-4 shadow-lg"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Flame className="size-4.5" />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-slate-900">
                Roasted this morning
              </span>
              <span className="block text-[11px] text-slate-500">
                Batch no. 214
              </span>
            </span>
          </Pop>
        </div>

        <div>
          <Eyebrow>{SITE.story.eyebrow}</Eyebrow>
          <p className="mt-3 text-[clamp(1.5rem,3.4cqi,2.3rem)] font-semibold leading-tight tracking-tight text-slate-950">
            <Typed text={SITE.story.title} on={on} />
          </p>
          <p className="mt-4 max-w-[44ch] text-[14.5px] leading-relaxed text-slate-600">
            We buy from a handful of farms, roast a little every day and sell it
            fresh — nothing sits on a shelf.
          </p>
          <ul className="mt-6 space-y-3">
            {SITE.story.points.map((point, i) => (
              <Pop
                key={point}
                as="li"
                on={on}
                index={i + 2}
                className="flex items-center gap-3 text-[14px] font-medium text-slate-800"
              >
                <span className="grid size-6 place-items-center rounded-full bg-amber-500 text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {point}
              </Pop>
            ))}
          </ul>
          <span className="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white">
            Read our story
          </span>
        </div>
      </div>
    </Block>
  );
}
