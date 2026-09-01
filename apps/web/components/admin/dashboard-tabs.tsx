'use client';

import { useState } from 'react';

import type {
  DashboardPaymentFilter,
  DashboardSnapshot,
  DashboardTab,
} from '@/lib/admin/dashboard-model';
import { DASHBOARD_TABS } from '@/lib/admin/dashboard-model';
import { DashboardActivity } from '@/components/admin/dashboard-activity';
import { DashboardInvoices } from '@/components/admin/dashboard-invoices';
import { DashboardOperations } from '@/components/admin/dashboard-operations';
import { DashboardOverview } from '@/components/admin/dashboard-overview';
import { DashboardPayments } from '@/components/admin/dashboard-payments';
import { Tabs } from '@/components/ui/tabs';

export function DashboardTabs({
  initialData,
}: {
  initialData: DashboardSnapshot;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [paymentFilter, setPaymentFilter] =
    useState<DashboardPaymentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch('/api/internal/dashboard', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Your session has expired. Sign in again, then refresh the page.'
            : 'The dashboard could not be refreshed. Try again.',
        );
      }

      setData((await response.json()) as DashboardSnapshot);
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : 'The dashboard could not be refreshed. Try again.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            A live view of money movement and platform health.
          </p>
          <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
            Updated{' '}
            {new Date(data.generatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {refreshError ? (
        <p role="alert" className="mb-4 text-sm text-flag">
          {refreshError}
        </p>
      ) : null}

      <Tabs
        className="min-w-0"
        activeIndex={DASHBOARD_TABS.indexOf(activeTab)}
        onActiveChange={(index) => {
          const nextTab = DASHBOARD_TABS[index];
          if (nextTab) setActiveTab(nextTab);
        }}
        tabs={[
          { label: 'Overview', content: <DashboardOverview data={data} /> },
          {
            label: 'Payments',
            content: (
              <DashboardPayments
                data={data}
                filter={paymentFilter}
                onFilterChange={setPaymentFilter}
              />
            ),
          },
          { label: 'Invoices', content: <DashboardInvoices data={data} /> },
          {
            label: 'Operations',
            content: (
              <DashboardOperations
                data={data}
                onReviewPayments={() => {
                  setPaymentFilter('needs-review');
                  setActiveTab('payments');
                }}
                onReviewInvoices={() => setActiveTab('invoices')}
              />
            ),
          },
          { label: 'Activity', content: <DashboardActivity data={data} /> },
        ]}
      />
    </div>
  );
}
