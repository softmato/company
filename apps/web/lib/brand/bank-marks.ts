/**
 * Every bank mark shipped in `public/banks/`, one entry per file.
 *
 * Generated from the directory listing rather than typed by hand, because a
 * mistyped slug here is a broken image that only shows up on the one screen
 * that renders that one bank.
 *
 * ## Nothing renders these yet, and that is not an oversight
 *
 * The platform has no bank entity: `payment_providers` holds exactly
 * `fonepay`, `esewa` and `khalti`, and no table records which bank a payment
 * came through. Fonepay is the rail that reaches banks, and its integration is
 * Phase 9 — blocked on the bank's own integration document (PHASES.md), which
 * is also what will say which banks are actually reachable and under what
 * names.
 *
 * So this registry is the assets made addressable, ready for that phase. It
 * deliberately stops short of drawing a picker: a grid of forty-nine banks on
 * a checkout page would be a claim about who Softmato can take money from,
 * and no document here supports it.
 *
 * `label` is the asset's own name, title-cased from its filename. It is not a
 * legal entity name and must not be printed as one on an invoice or receipt.
 */
import type { MarkAsset } from './mark-asset';

export const BANK_MARKS = {
  'agricultural-development': {
    src: '/banks/agricultural-development.png',
    label: 'Agricultural Development',
  },
  ambe: { src: '/banks/ambe.png', label: 'Ambe' },
  asha: { src: '/banks/asha.png', label: 'Asha' },
  'bank-of-kathmandu': {
    src: '/banks/bank-of-kathmandu.png',
    label: 'Bank Of Kathmandu',
  },
  'century-commercial': {
    src: '/banks/century-commercial.png',
    label: 'Century Commercial',
    ratio: 0.73,
  },
  chhimek: { src: '/banks/chhimek.png', label: 'Chhimek' },
  citizens: { src: '/banks/citizens.png', label: 'Citizens', ratio: 2.86 },
  civil: { src: '/banks/civil.png', label: 'Civil' },
  deprosc: { src: '/banks/deprosc.png', label: 'DEPROSC' },
  'development-credit': {
    src: '/banks/development-credit.png',
    label: 'Development Credit',
  },
  everest: { src: '/banks/everest.png', label: 'Everest' },
  'first-microfinance': {
    src: '/banks/first-microfinance.png',
    label: 'First Microfinance',
  },
  'forward-community': {
    src: '/banks/forward-community.png',
    label: 'Forward Community',
    ratio: 0.75,
  },
  garima: { src: '/banks/garima.png', label: 'Garima' },
  'global-ime': { src: '/banks/global-ime.png', label: 'Global IME' },
  'grameen-bikas': { src: '/banks/grameen-bikas.png', label: 'Grameen Bikas' },
  himalayan: { src: '/banks/himalayan.png', label: 'Himalayan' },
  infinity: { src: '/banks/infinity.png', label: 'Infinity', ratio: 1.49 },
  janata: { src: '/banks/janata.png', label: 'Janata' },
  jyoti: { src: '/banks/jyoti.png', label: 'Jyoti' },
  'kamana-sewa': {
    src: '/banks/kamana-sewa.png',
    label: 'Kamana Sewa',
    ratio: 0.63,
  },
  kumari: { src: '/banks/kumari.png', label: 'Kumari', ratio: 1.43 },
  'laxmi-sunrise': { src: '/banks/laxmi-sunrise.png', label: 'Laxmi Sunrise' },
  lumbini: { src: '/banks/lumbini.png', label: 'Lumbini' },
  machhapuchchhre: {
    src: '/banks/machhapuchchhre.png',
    label: 'Machhapuchchhre',
  },
  mithila: { src: '/banks/mithila.png', label: 'Mithila' },
  muktinath: { src: '/banks/muktinath.png', label: 'Muktinath' },
  'nabil-ncb': { src: '/banks/nabil-ncb.png', label: 'Nabil NCB' },
  nabil: { src: '/banks/nabil.png', label: 'Nabil' },
  'national-development': {
    src: '/banks/national-development.png',
    label: 'National Development',
  },
  ncc: { src: '/banks/ncc.png', label: 'NCC', ratio: 1.64 },
  'nepal-bank': { src: '/banks/nepal-bank.png', label: 'Nepal Bank' },
  'nepal-investment-mega': {
    src: '/banks/nepal-investment-mega.png',
    label: 'Nepal Investment Mega',
  },
  'nepal-rastra': { src: '/banks/nepal-rastra.png', label: 'Nepal Rastra' },
  'nepal-sbi': { src: '/banks/nepal-sbi.png', label: 'Nepal SBI' },
  nerude: { src: '/banks/nerude.png', label: 'Nerude' },
  'nic-asia': { src: '/banks/nic-asia.png', label: 'NIC Asia' },
  nmb: { src: '/banks/nmb.png', label: 'NMB' },
  'prabhu-mahalaxmi': {
    src: '/banks/prabhu-mahalaxmi.png',
    label: 'Prabhu Mahalaxmi',
  },
  prabhu: { src: '/banks/prabhu.png', label: 'Prabhu' },
  'prime-commercial': {
    src: '/banks/prime-commercial.png',
    label: 'Prime Commercial',
    ratio: 0.73,
  },
  'sana-kisan': { src: '/banks/sana-kisan.png', label: 'Sana Kisan' },
  sanima: { src: '/banks/sanima.png', label: 'Sanima', ratio: 1.34 },
  'shangri-la': {
    src: '/banks/shangri-la.png',
    label: 'Shangri La',
    ratio: 0.66,
  },
  siddhartha: { src: '/banks/siddhartha.png', label: 'Siddhartha' },
  'standard-chartered': {
    src: '/banks/standard-chartered.png',
    label: 'Standard Chartered',
    ratio: 0.64,
  },
  'suryodaya-womi': {
    src: '/banks/suryodaya-womi.png',
    label: 'Suryodaya WOMI',
  },
  suva: { src: '/banks/suva.png', label: 'Suva' },
  swbbl: { src: '/banks/swbbl.png', label: 'SWBBL' },
  womi: { src: '/banks/womi.png', label: 'WOMI' },
} as const satisfies Record<string, MarkAsset>;

/** The slug of every bank that has a mark. */
export type BankSlug = keyof typeof BANK_MARKS;

/** Every slug, in the order the marks are declared (alphabetical). */
export const BANK_SLUGS = Object.keys(BANK_MARKS) as BankSlug[];

/**
 * The mark for a bank slug, or `null` when there is none.
 *
 * Takes a `string` for the same reason `walletMark` does: the caller will be
 * holding a value read from somewhere, not a literal.
 */
export function bankMark(slug: string): MarkAsset | null {
  return (BANK_MARKS as Record<string, MarkAsset>)[slug] ?? null;
}
