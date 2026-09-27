/**
 * Enquiries — `/admin/enquiries`.
 *
 * Everything sent through the public contact form. Each one is also emailed
 * to the admins (lib/contact/notify.ts), but the email can fail or be missed;
 * this is the record. "Handled" is a shared marker so two founders do not
 * both answer the same person.
 */
import Link from 'next/link';

import {
  countOpenEnquiries,
  listEnquiries,
  type EnquiryFilter,
  type EnquiryRow,
} from '@/lib/admin/enquiries-queries';
import { enquiryTitle } from '@/lib/email/templates/contact-enquiry';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

import { setEnquiryHandledAction, setEnquirySpamAction } from './actions';

export const dynamic = 'force-dynamic';

const FILTERS: { value: EnquiryFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'handled', label: 'Handled' },
  { value: 'all', label: 'All' },
  { value: 'spam', label: 'Spam' },
];

export default async function EnquiriesPage({
  searchParams,
}: PageProps<'/admin/enquiries'>) {
  const { show } = await searchParams;
  const filter: EnquiryFilter =
    show === 'handled' || show === 'all' || show === 'spam' ? show : 'open';

  const [enquiries, open] = await Promise.all([
    listEnquiries(filter),
    countOpenEnquiries(),
  ]);

  return (
    <div>
      <h1 className="headline text-[30px] leading-tight">Enquiries</h1>
      <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
        Messages from the contact form on softmato.com, newest first. Each one
        is emailed to every admin as it arrives; mark it handled once someone
        has replied. Likely spam is held under Spam instead, without an email —
        restore anything real with “Not spam”.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={
              value === 'open'
                ? '/admin/enquiries'
                : `/admin/enquiries?show=${value}`
            }
            aria-current={filter === value ? 'true' : undefined}
            className={cn(
              'inline-flex h-7 items-center rounded-md px-2.5 font-mono text-[12px]',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              filter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            {value === 'open' && open > 0 ? ` · ${open}` : ''}
          </Link>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <Card className="mt-6 p-5">
          <EmptyState
            title={
              filter === 'open'
                ? 'Nothing waiting'
                : filter === 'spam'
                  ? 'No spam caught'
                  : 'No enquiries here'
            }
            description={
              filter === 'open'
                ? 'Every enquiry has been handled. New ones from the contact form land here and in your inbox.'
                : filter === 'spam'
                  ? 'Messages the spam check flags are held here, not emailed.'
                  : 'When someone sends the contact form, it shows up here.'
            }
          />
        </Card>
      ) : (
        <ul className="mt-6 grid gap-3">
          {enquiries.map((enquiry) => (
            <li key={enquiry.id}>
              <EnquiryCard enquiry={enquiry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnquiryCard({ enquiry }: { enquiry: EnquiryRow }) {
  const title = enquiryTitle(enquiry);
  const handled = enquiry.handledAt !== null;
  const spam = enquiry.spamReason !== null;
  const reply = `mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${title}`)}`;

  return (
    <Card className={cn('px-5 py-4', handled && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="headline text-[17px]">{title}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="text-foreground">{enquiry.name}</span>
            {' · '}
            <a href={`mailto:${enquiry.email}`} className="hover:underline">
              {enquiry.email}
            </a>
            {enquiry.phone ? (
              <>
                {' · '}
                <a href={`tel:${enquiry.phone}`} className="hover:underline">
                  {enquiry.phone}
                </a>
              </>
            ) : null}
            {' · '}
            <BsDate date={enquiry.createdAt} format="full" />
          </p>
        </div>

        <Badge tone={spam ? 'flag' : handled ? 'quiet' : 'primary'}>
          {spam ? 'Spam' : handled ? 'Handled' : 'Open'}
        </Badge>
      </div>

      {spam ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Flagged: {enquiry.spamReason}
        </p>
      ) : null}

      <p className="mt-3 max-w-[80ch] whitespace-pre-wrap text-sm leading-relaxed">
        {enquiry.message}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={reply} className={buttonClasses('secondary', 'sm')}>
          Reply by email
        </a>

        {spam ? null : (
          <form action={setEnquiryHandledAction}>
            <input type="hidden" name="id" value={enquiry.id} />
            <input type="hidden" name="handled" value={handled ? '0' : '1'} />
            <Button type="submit" variant="ghost" size="sm">
              {handled ? 'Reopen' : 'Mark handled'}
            </Button>
          </form>
        )}

        <form action={setEnquirySpamAction}>
          <input type="hidden" name="id" value={enquiry.id} />
          <input type="hidden" name="spam" value={spam ? '0' : '1'} />
          <Button type="submit" variant="ghost" size="sm">
            {spam ? 'Not spam' : 'Mark as spam'}
          </Button>
        </form>

        {handled && enquiry.handledAt ? (
          <span className="text-[12px] text-muted-foreground">
            Handled{enquiry.handledByName ? ` by ${enquiry.handledByName}` : ''}{' '}
            <BsDate date={enquiry.handledAt} />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
