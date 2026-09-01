import { auth } from '@/lib/auth';
import { dashboardSnapshot } from '@/lib/admin/dashboard-queries';

/** Admin-only read endpoint used by the dashboard's explicit refresh action. */
export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    );
  }

  try {
    const data = await dashboardSnapshot();

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
