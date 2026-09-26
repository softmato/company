/**
 * The client's front page: every project, what needs them, what they owe.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, FolderKanban, Wallet } from 'lucide-react';

import { Money } from '@/components/ui/money';
import { EmptyArt } from '@/components/portal/empty-art';
import { OverviewHero } from '@/components/portal/overview-hero';
import { ProjectCard } from '@/components/portal/project-card';
import { RecentMessages } from '@/components/portal/recent-messages';
import { StatCard } from '@/components/portal/stat-card';
import { ART } from '@/lib/portal/art';
import { clientInvoices } from '@/lib/portal/invoices';
import {
  clientProjectSummaries,
  recentClientMessages,
} from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';

export const metadata: Metadata = { title: 'Overview' };

function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Kathmandu',
    }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default async function PortalOverviewPage() {
  const viewer = await requireViewer();

  const [summaries, invoices, messages] = await Promise.all([
    clientProjectSummaries(viewer.clientId),
    clientInvoices(viewer.customerId),
    recentClientMessages(viewer.clientId),
  ]);

  const live = summaries.filter(
    (s) => s.project.status === 'active' || s.project.status === 'on_hold',
  );
  const past = summaries.filter((s) => !live.includes(s));
  const toReview = summaries.reduce((n, s) => n + s.awaitingReview, 0);
  const reviewFirst = summaries.find((s) => s.awaitingReview > 0);
  const open = invoices.filter(
    (i) => i.status === 'issued' || i.status === 'partially_paid',
  );
  const owed = open.reduce((n, i) => n + (i.totalMinor - i.paidMinor), 0n);
  const firstName = viewer.name.split(/\s+/)[0];

  const [summary, action] = reviewFirst
    ? [
        `${plural(toReview, 'deliverable')} ${toReview === 1 ? 'is' : 'are'} ready for your review.`,
        {
          label: 'Review now',
          href: `/projects/${reviewFirst.project.id}#deliverables`,
        },
      ]
    : open.length > 0
      ? [
          `You have ${plural(open.length, 'open invoice')}.`,
          { label: 'See invoices', href: '/invoices' },
        ]
      : live.length > 0
        ? [
            `${plural(live.length, 'project')} in progress — here is where each one stands.`,
            undefined,
          ]
        : [
            'Your projects, files and invoices with Softmato, all in one place.',
            undefined,
          ];

  return (
    <div className="space-y-8">
      <OverviewHero
        clientName={viewer.clientName}
        greeting={`${greeting()}, ${firstName}.`}
        summary={summary}
        action={action}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          tone="emerald"
          label="Projects in progress"
          value={live.length}
        />
        <StatCard
          icon={ClipboardCheck}
          tone="violet"
          label="Waiting on you"
          value={toReview}
          note={
            toReview > 0 ? 'Deliverables ready for review' : 'Nothing to review'
          }
          highlight={toReview > 0}
        />
        <StatCard
          icon={Wallet}
          tone="amber"
          label="Balance due"
          value={<Money minor={owed} unit />}
          note={
            open.length > 0 ? (
              <Link
                href="/invoices"
                className="font-medium text-amber-700 hover:underline"
              >
                {plural(open.length, 'open invoice')} →
              </Link>
            ) : (
              'All settled'
            )
          }
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="headline text-[20px]">
            Your projects
          </h2>

          {summaries.length === 0 ? (
            <EmptyArt
              className="mt-4"
              art={ART.team}
              title="Your first project will appear here"
              description="Once the team has set it up you will see its stages, dates and files, watch the site take shape, and be able to message everyone working on it."
            />
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {live.map((s) => (
                <ProjectCard
                  key={s.project.id}
                  summary={s}
                  href={`/projects/${s.project.id}`}
                />
              ))}
            </div>
          )}

          {past.length > 0 ? (
            <>
              <h3 className="eyebrow mt-8">Finished</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {past.map((s) => (
                  <ProjectCard
                    key={s.project.id}
                    summary={s}
                    href={`/projects/${s.project.id}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </section>

        <aside>
          <RecentMessages messages={messages} />
        </aside>
      </div>
    </div>
  );
}
