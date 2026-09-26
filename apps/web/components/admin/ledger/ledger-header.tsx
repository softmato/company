import type { CredentialMode } from '@softmato/db';

import { Badge } from '@/components/ui/badge';

import { YearPicker } from './year-picker';

/**
 * Title, the books it reads (Production or Sandbox, from the admin switch),
 * the fiscal-year picker and any page actions such as an export.
 */
export function LedgerHeader({
  title,
  lead,
  mode,
  years,
  fiscalYear,
  actions,
}: {
  title: string;
  lead: string;
  mode: CredentialMode;
  years: string[];
  fiscalYear: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="headline flex flex-wrap items-center gap-3 text-[30px] leading-tight">
          {title}
          <Badge tone={mode === 'live' ? 'primary' : 'neutral'}>
            {mode === 'live' ? 'Production books' : 'Sandbox books'}
          </Badge>
        </h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
          {lead}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <YearPicker years={years} value={fiscalYear} />
        {actions}
      </div>
    </div>
  );
}
