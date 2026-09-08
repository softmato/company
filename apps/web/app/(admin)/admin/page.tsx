/**
 * Admin dashboard.
 *
 * The server owns the first read and the client tabs own only presentation
 * state. Refreshes use the same read model through the guarded internal API.
 */
import { dashboardSnapshot } from '@/lib/admin/dashboard-queries';
import { adminMode } from '@/lib/admin/mode';
import { DashboardTabs } from '@/components/admin/dashboard-tabs';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  /*
   * The section-wide selection, not a parameter of this page. The switch lives
   * in the admin header and every page under it reads the same cookie, so
   * moving from here to /admin/payments keeps the same set of books open.
   */
  const mode = await adminMode();
  const data = await dashboardSnapshot(mode);

  return (
    <div>
      <h1 className="headline text-[30px] leading-tight">Dashboard</h1>
      <DashboardTabs initialData={data} />
    </div>
  );
}
