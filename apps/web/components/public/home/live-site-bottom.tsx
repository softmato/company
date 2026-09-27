'use client';

import { Camera, Coffee, MapPin, Navigation } from 'lucide-react';

import { cn } from '@/lib/cn';
import { SITE } from '@/lib/home/live-build';

import { Block, Photo, Pop, Typed, useBuild } from './live-build-parts';

export function SiteGallery() {
  const { at } = useBuild();
  const on = at('gallery');

  return (
    <Block region="gallery" shown={on} className="bg-white">
      <div className="mx-auto max-w-[64rem] px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-[clamp(1.5rem,3.4cqi,2.3rem)] font-semibold leading-tight tracking-tight text-slate-950">
            <Typed text="Come for the coffee, stay for the light" on={on} />
          </p>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-700">
            <Camera className="size-4" />
            @yourcafe
          </span>
        </div>
        <div className="mt-8 grid auto-rows-[8rem] grid-cols-2 gap-3 @3xl:auto-rows-[10.5rem] @3xl:grid-cols-4">
          {SITE.gallery.map((src, i) => (
            <Pop
              key={src}
              on={on}
              index={i}
              className={cn(
                'relative overflow-hidden rounded-2xl',
                i === 0 && 'col-span-2 @3xl:row-span-2',
              )}
            >
              <Photo src={src} sizes={i === 0 ? '520px' : '260px'} />
            </Pop>
          ))}
        </div>
      </div>
    </Block>
  );
}

/** A drawn street map: blocks, two roads, a river, and the café's pin. */
function DrawnMap() {
  return (
    <div className="relative min-h-[15rem] overflow-hidden bg-[#eef2ea]">
      <svg
        viewBox="0 0 400 260"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <path
          d="M-10 190 C80 160 140 230 240 200 S360 150 420 170"
          fill="none"
          stroke="#bfdbfe"
          strokeWidth="18"
        />
        <path
          d="M0 90 H400 M150 0 V260 M290 0 V260 M0 30 L400 150"
          stroke="#fff"
          strokeWidth="10"
        />
        {[
          [20, 40, 110, 36],
          [170, 40, 100, 38],
          [310, 20, 80, 50],
          [20, 110, 110, 50],
          [170, 108, 100, 40],
          [310, 104, 80, 40],
        ].map(([x, y, w, h]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx="8"
            fill="#dfe7d8"
          />
        ))}
      </svg>
      <span className="absolute left-[40%] top-[38%] -translate-x-1/2 -translate-y-full">
        <span className="build-pin absolute -bottom-1 left-1/2 size-8 -translate-x-1/2 rounded-full bg-rose-500/30" />
        <span className="relative grid size-10 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40">
          <Coffee className="size-4.5" />
        </span>
      </span>
      <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-md">
        <MapPin className="size-4 text-rose-500" />
        On the corner, by the river
      </span>
    </div>
  );
}

export function SiteVisit() {
  const { at } = useBuild();
  const on = at('visit');

  return (
    <Block region="visit" shown={on} className="bg-white">
      <div className="mx-auto max-w-[64rem] px-6 pb-16">
        <div className="grid overflow-hidden rounded-3xl bg-slate-950 text-white @3xl:grid-cols-[1.2fr_1fr]">
          <DrawnMap />
          <div className="p-8">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-300">
              Visit us
            </p>
            <p className="mt-2 text-[clamp(1.4rem,3cqi,2rem)] font-semibold tracking-tight">
              <Typed text="Pull up a chair" on={on} />
            </p>
            <dl className="mt-6 divide-y divide-white/10 text-[13.5px]">
              {SITE.hours.map(([day, time], i) => (
                <Pop
                  key={day}
                  on={on}
                  index={i + 1}
                  className="flex justify-between py-2.5"
                >
                  <dt className="text-white/60">{day}</dt>
                  <dd className="font-medium">{time}</dd>
                </Pop>
              ))}
            </dl>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-900">
              <Navigation className="size-4" />
              Get directions
            </span>
          </div>
        </div>
      </div>
    </Block>
  );
}

export function SiteFooter() {
  const { at } = useBuild();
  const on = at('footer');

  return (
    <Block region="footer" shown={on} className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-[64rem] gap-10 px-6 py-12 @3xl:grid-cols-[1.4fr_1fr_1fr_1.5fr]">
        <div>
          <span className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500">
              <Coffee className="size-4.5" />
            </span>
            <span className="text-[15px] font-semibold">{SITE.brand}</span>
          </span>
          <p className="mt-4 max-w-[26ch] text-[13px] leading-relaxed text-white/55">
            Small-batch coffee, roasted daily and poured with care.
          </p>
        </div>
        {[
          ['Visit', ['Menu', 'Hours', 'Directions']],
          ['Café', ['Our story', 'Gallery', 'Contact']],
        ].map(([title, links]) => (
          <div key={title as string}>
            <p className="text-[13px] font-semibold">{title}</p>
            <ul className="mt-3 space-y-2 text-[13px] text-white/55">
              {(links as string[]).map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-[13px] font-semibold">Get the weekly roast</p>
          <span className="mt-3 flex items-center rounded-full bg-white/10 p-1 pl-4 text-[12.5px] text-white/45 ring-1 ring-inset ring-white/10">
            you@email.com
            <span className="ml-auto rounded-full bg-amber-400 px-4 py-1.5 font-semibold text-slate-950">
              Join
            </span>
          </span>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[64rem] flex-wrap justify-between gap-2 px-6 py-5 text-[11.5px] text-white/40">
          <span>© {SITE.brand}</span>
          <span>
            Built and looked after by{' '}
            <span className="font-semibold text-white/80">softmato</span>
          </span>
        </div>
      </div>
    </Block>
  );
}
