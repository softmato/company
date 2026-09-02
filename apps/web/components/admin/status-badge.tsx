/**
 * One status pill, for every admin table.
 *
 * The five screens each had their own copy of this ternary chain, and they had
 * already drifted — the same status rendered a different colour depending on
 * which page you were looking at. On a payments screen that is not cosmetic:
 * `reconciliation_required` reading as red on one page and amber on another is
 * the difference between "this failed" and "someone must look at this".
 *
 * Anything unmapped falls back to neutral rather than to a colour that asserts
 * something. A grey pill saying an unfamiliar word is honest; a green one is
 * not.
 */
type Tone = 'good' | 'busy' | 'warn' | 'bad' | 'neutral';

const TONES: Record<Tone, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  busy: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

/**
 * Every status the payment, invoice and refund tables can hold.
 *
 * `reconciliation_required` is amber and never red, deliberately: money may
 * well have arrived, and the row is a question rather than a failure.
 */
const TONE_BY_STATUS: Record<string, Tone> = {
  // transactions
  succeeded: 'good',
  created: 'busy',
  pending: 'busy',
  reconciliation_required: 'warn',
  partially_refunded: 'warn',
  refunded: 'neutral',
  reversed: 'neutral',
  failed: 'bad',
  cancelled: 'neutral',
  expired: 'neutral',

  // invoices
  paid: 'good',
  issued: 'busy',
  partially_paid: 'warn',
  past_due: 'bad',
  draft: 'neutral',

  // refunds
  requested: 'busy',
  approved: 'busy',
  rejected: 'neutral',
  processing: 'busy',

  // reconciliation
  open: 'warn',
  resolved: 'good',
  investigating: 'warn',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status] ?? 'neutral';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-semibold uppercase ${TONES[tone]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
