'use client';

import { ArrowRight, Check, Coffee, Menu, Play } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PHOTO, SITE } from '@/lib/home/live-build';

import { Block, Photo, Pop, Typed, useBuild } from './live-build-parts';

/** The café's header: light at first, dark once the client asks. */
export function SiteHeader() {
  const { at, tweaks } = useBuild();
  const dark = at('update') || tweaks.has('dark');
  const green = tweaks.has('green');

  return (
    <Block region="header" shown={at('header')}>
      <div
        className={cn(
          'transition-colors duration-700',
          dark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[64rem] items-center gap-3 px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-rose-500/30">
            <Coffee className="size-4.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            <Typed by="char" text={SITE.brand} on={at('header')} />
          </span>
          <nav
            data-cursor="nav"
            className="mx-auto hidden gap-8 text-[13px] opacity-75 @3xl:flex"
          >
            {SITE.nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
          <span
            data-cursor="signin"
            className={cn(
              'ml-auto hidden rounded-full px-4 py-2 text-[12.5px] font-medium ring-1 ring-inset @xl:inline-flex @3xl:ml-0',
              dark ? 'ring-white/20' : 'ring-slate-300',
            )}
          >
            Sign in
          </span>
          <span
            data-cursor="order"
            className={cn(
              'hidden rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-700 @xl:inline-flex',
              !dark
                ? 'bg-slate-900 text-white'
                : green
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-amber-400 text-slate-950',
            )}
          >
            Order ahead
          </span>
          <Menu className="ml-auto size-5 @xl:hidden" />
        </div>
      </div>
    </Block>
  );
}

/** Two little pills like a quiz on the photo, each with a ticked box. */
function Choice({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="flex items-center gap-2.5 rounded-2xl bg-white py-2 pl-2.5 pr-4 text-[12.5px] font-medium text-slate-800 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)]">
      <span
        className={cn(
          'grid size-5 place-items-center rounded-md text-white',
          tone,
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      {label}
    </span>
  );
}

/**
 * The hero: a gradient lead word over a plain second line, body, two buttons
 * and three perks on the left; on the right a photo on a warm panel with
 * cards floating round it.
 */
export function SiteHero() {
  const { at, tweaks } = useBuild();
  const after = at('update') || tweaks.has('headline');
  const copy = after ? SITE.after : SITE.before;
  const art = at('heroArt');
  const green = tweaks.has('green');

  return (
    <Block region="hero" shown={at('hero')} className="overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_70%_at_15%_20%,#fff1e6,transparent),radial-gradient(50%_60%_at_90%_80%,#ffe4ec,transparent)]"
      />
      <div className="relative mx-auto grid max-w-[64rem] items-center gap-10 px-6 py-12 @3xl:grid-cols-[1.05fr_1fr] @3xl:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Roastery &amp; café
          </span>
          <p className="mt-5 text-[clamp(2.1rem,5.6cqi,4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-slate-950">
            <span className="block">
              <Typed
                key={copy.lead}
                text={copy.lead}
                on={at('hero')}
                className={cn(
                  'bg-gradient-to-r bg-clip-text text-transparent',
                  green
                    ? 'from-emerald-500 via-teal-500 to-emerald-700'
                    : 'from-amber-500 via-orange-500 to-rose-500',
                )}
              />
            </span>
            <span className="block">
              <Typed
                key={copy.rest}
                text={copy.rest}
                on={at('hero')}
                delay={copy.lead.split(' ').length * 120 + 150}
              />
            </span>
          </p>
          <p className="mt-5 max-w-[40ch] text-[14.5px] leading-relaxed text-slate-600">
            <Typed
              key={copy.body}
              text={copy.body}
              on={at('hero')}
              delay={900}
            />
          </p>
          <Pop on={at('hero')} index={4} className="mt-7 flex flex-wrap gap-3">
            <span
              data-cursor="cta"
              className={cn(
                'inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r p-1.5 pr-5 text-[13px] font-semibold text-white shadow-lg',
                green
                  ? 'from-emerald-500 to-teal-600 shadow-emerald-600/25'
                  : 'from-amber-500 to-rose-500 shadow-rose-500/25',
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-white/25">
                <ArrowRight className="size-3.5" />
              </span>
              {copy.cta}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/80 px-5 py-2.5 text-[13px] font-semibold text-slate-800 ring-1 ring-inset ring-slate-300">
              Find us
            </span>
          </Pop>
          <Pop on={at('hero')} index={5}>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-slate-500">
              {SITE.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-slate-400" />
                  {perk}
                </li>
              ))}
            </ul>
          </Pop>
        </div>

        <div className="relative h-[21rem] @3xl:h-[27rem]">
          <Pop
            on={art}
            className="absolute inset-y-0 left-[12%] right-[6%] overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_40px_70px_-30px_rgba(244,63,94,0.55)]"
          >
            <Photo
              src={PHOTO.heroBefore}
              className={after ? 'opacity-0' : 'opacity-100'}
            />
            <Photo
              src={PHOTO.heroAfter}
              className={after ? 'opacity-100' : 'opacity-0'}
            />
            <span
              data-cursor="photo"
              className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow-xl"
            >
              <Play className="size-5 translate-x-0.5 fill-current" />
            </span>
          </Pop>

          <Pop
            on={art}
            index={1}
            className="absolute left-0 top-[14%] grid gap-2"
          >
            <Choice label="Oat milk?" tone="bg-orange-500" />
            <Choice label="Extra shot?" tone="bg-sky-500" />
          </Pop>

          <Pop
            on={art}
            index={2}
            className="absolute right-0 top-[6%] hidden w-[11rem] rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-white/70 @md:block"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Today’s roast
            </p>
            <p className="mt-1 text-[14px] font-semibold text-slate-900">
              Ethiopia
            </p>
            <span className="mt-2 flex gap-1">
              {[1, 1, 1, 0, 0].map((on, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full',
                    on ? 'bg-amber-500' : 'bg-slate-200',
                  )}
                />
              ))}
            </span>
            <p className="mt-1.5 text-[10.5px] text-slate-500">Medium roast</p>
          </Pop>

          <Pop
            on={art}
            index={3}
            className="absolute -bottom-2 right-0 flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 pr-4 shadow-xl ring-1 ring-white/70"
          >
            <span className="relative size-14 overflow-hidden rounded-xl">
              <Photo src={PHOTO.pastry} sizes="56px" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-slate-900">
                Almond croissant
              </span>
              <span className="mt-0.5 block text-[15px] font-bold text-slate-950">
                NPR 280
              </span>
              <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Fresh at 7am
              </span>
            </span>
          </Pop>
        </div>
      </div>
    </Block>
  );
}
