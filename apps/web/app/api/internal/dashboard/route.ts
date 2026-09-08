import { auth } from '@/lib/auth';
import { dashboardSnapshot } from '@/lib/admin/dashboard-queries';

/** Admin-only read endpoint used by the dashboard's explicit refresh action. */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    );
  }

  /*
   * The refresh has to be told which mode it is refreshing. Defaulting to
   * Production here as well means a malformed or absent parameter shows real
   * money rather than silently swapping the page to Sandbox figures.
   */
  const requested = new URL(request.url).searchParams.get('mode');
  const mode = requested === 'test' ? 'test' : 'live';

  try {
    const data = await dashboardSnapshot(mode);

    return Response.json(data, {
      headers: {
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('admin dashboard read failed', error);

    return Response.json(
      { error: { code: 'INTERNAL', message: 'Dashboard data unavailable.' } },
      { status: 500 },
    );
  }
}
