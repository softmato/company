import Link from 'next/link';
import {
  ArrowRight,
  Flame,
  Leaf,
  Mountain,
  PackageCheck,
  Receipt,
  Truck,
} from 'lucide-react';

import { TEAS } from '@/components/previews/himalayan-tea/catalogue';
import { Hills } from '@/components/previews/himalayan-tea/hills';
import { TeaCard } from '@/components/previews/himalayan-tea/tea-card';
import { TeaTin } from '@/components/previews/himalayan-tea/tea-tin';

const STEPS = [
  {
    icon: Leaf,
    title: 'Picked by hand',
    body: 'Two leaves and a bud, from bushes on the Ilam hillsides.',
  },
  {
    icon: Flame,
    title: 'Rolled and dried',
    body: 'In the garden’s own factory, the same week it is picked.',
  },
  {
    icon: PackageCheck,
    title: 'Packed for you',
    body: 'Sealed in tins in small batches, and on its way to you.',
  },
];

const GARDEN_SKY = [
  'linear-gradient(160deg,#9db88f,#3f6b45)',
  'linear-gradient(160deg,#bccf9c,#58803c)',
  'linear-gradient(160deg,#b3c6c3,#2b6f73)',
];

const GARDENS = [
  {
    name: 'Ilam',
    line: 'Nepal’s oldest tea district, and home to most of our black teas.',
  },
  {
    name: 'Kanyam',
    line: 'Rolling estates on the ridge road, known for bright green teas.',
  },
  {
    name: 'Dhankuta',
    line: 'Higher and cooler — slow-grown leaf for our oolong.',
  },
];

export default function HimalayanTeaHome() {
  const featured = TEAS.filter((t) => t.featured);
  const [a, b, c] = featured;

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Hills />
        <div className="relative mx-auto grid min-h-[34rem] max-w-6xl items-start gap-8 px-5 pb-56 pt-14 sm:min-h-[40rem] sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="ht-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[var(--ht-leaf)] ring-1 ring-[var(--ht-leaf)]/15 backdrop-blur">
              <Mountain className="size-3.5" aria-hidden="true" />
              Single-estate tea from eastern Nepal
            </p>
            <h1 className="mt-5 max-w-[14ch] font-[family-name:var(--font-tea)] text-[44px] leading-[1.02] tracking-tight sm:text-[64px]">
              Tea from the hills, packed the week it’s picked.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-[#1b1a17]/70">
              First and second flush, green, oolong and chai — straight from the
              gardens of Ilam, Kanyam and Dhankuta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--ht-green)] px-6 font-medium text-[var(--ht-cream)] shadow-lg shadow-[#1f3d2b]/25 transition-transform hover:-translate-y-0.5"
              >
                Shop the teas
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/wholesale"
                className="inline-flex h-12 items-center rounded-full bg-white/80 px-6 font-medium ring-1 ring-[#1b1a17]/10 backdrop-blur transition-colors hover:bg-white"
              >
                Wholesale price list
              </Link>
            </div>
          </div>

          {a && b && c ? (
            <div aria-hidden="true" className="relative hidden h-80 lg:block">
              <TeaTin
                tea={b}
                className="ht-rise absolute left-[8%] top-16 h-56 w-auto -rotate-6 [animation-delay:150ms]"
              />
              <TeaTin
                tea={a}
                className="ht-rise absolute left-[34%] top-2 h-72 w-auto [animation-delay:60ms]"
              />
              <TeaTin
                tea={c}
                className="ht-rise absolute left-[62%] top-20 h-52 w-auto rotate-6 [animation-delay:240ms]"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--ht-amber)]">
              This season
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-tea)] text-[36px] leading-tight sm:text-[44px]">
              Teas we are proud of
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 font-medium text-[var(--ht-green)] hover:underline"
          >
            See all eight
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((tea) => (
            <TeaCard key={tea.id} tea={tea} />
          ))}
        </div>
      </section>

      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-[family-name:var(--font-tea)] text-[36px] leading-tight sm:text-[44px]">
            From garden to cup
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                className="ht-reveal relative rounded-[28px] bg-[var(--ht-cream)] p-6 ring-1 ring-[#1b1a17]/6"
              >
                <span className="absolute right-6 top-5 font-[family-name:var(--font-tea)] text-5xl text-[#1b1a17]/8">
                  {i + 1}
                </span>
                <span className="grid size-12 place-items-center rounded-2xl bg-[var(--ht-green)] text-[#c9e3b1]">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-5 text-lg font-semibold">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#1b1a17]/65">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="ht-reveal relative overflow-hidden rounded-[36px] bg-[#16301f] px-7 py-12 text-[#e9e2d2] sm:px-12">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-80 rounded-full bg-[var(--ht-amber)]/25 blur-3xl"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm font-medium text-[#c9e3b1]">
                For cafés, hotels and shops
              </p>
              <h2 className="mt-2 max-w-[18ch] font-[family-name:var(--font-tea)] text-[36px] leading-tight text-white sm:text-[44px]">
                Your own price list, ordered by the carton.
              </h2>
              <ul className="mt-6 space-y-2.5 text-sm text-[#e9e2d2]/80">
                <li className="flex items-center gap-2.5">
                  <Receipt
                    className="size-4 text-[#c9e3b1]"
                    aria-hidden="true"
                  />{' '}
                  Invoices with your PAN and VAT
                </li>
                <li className="flex items-center gap-2.5">
                  <Truck className="size-4 text-[#c9e3b1]" aria-hidden="true" />{' '}
                  Delivered across Nepal in 3–5 days
                </li>
              </ul>
              <Link
                href="/wholesale"
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--ht-amber)] px-6 font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Open the wholesale page
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="hidden grid-cols-3 gap-3 lg:grid"
            >
              {TEAS.slice(0, 6).map((tea) => (
                <div
                  key={tea.id}
                  className="grid size-24 place-items-center rounded-2xl bg-white/6 ring-1 ring-white/10"
                >
                  <TeaTin tea={tea} className="h-16 w-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="gardens" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-[family-name:var(--font-tea)] text-[36px] leading-tight sm:text-[44px]">
            Our gardens
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {GARDENS.map((garden, i) => (
              <article
                key={garden.name}
                className="ht-reveal overflow-hidden rounded-[28px] bg-white ring-1 ring-[#1b1a17]/6"
              >
                <svg
                  viewBox="0 0 300 110"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="block h-28 w-full"
                  style={{ background: GARDEN_SKY[i] }}
                >
                  <path
                    d="M0 58 60 30l40 22 55-34 50 30 45-18 50 26v54H0Z"
                    fill="#fff"
                    opacity="0.18"
                  />
                  <path
                    d="M0 80c60-22 120-6 180-20s90-4 120 4v46H0Z"
                    fill="#000"
                    opacity="0.14"
                  />
                  {[0, 1, 2].map((row) => (
                    <path
                      key={row}
                      d={`M-10 ${88 + row * 9}C90 ${80 + row * 9} 200 ${92 + row * 9} 310 ${84 + row * 9}`}
                      fill="none"
                      stroke="#000"
                      strokeOpacity="0.18"
                      strokeWidth="5"
                      strokeDasharray="1 9"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div className="p-6">
                  <p className="font-[family-name:var(--font-tea)] text-2xl">
                    {garden.name}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#1b1a17]/65">
                    {garden.line}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
