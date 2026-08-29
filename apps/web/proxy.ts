/**
 * Subdomain → route group rewriting (docs/ARCHITECTURE.md §1).
 *
 *   softmato.com          → (public)
 *   admin.softmato.com    → (admin)
 *   payment.softmato.com  → (checkout)
 *   agency.softmato.com   → (portal)
 *
 * Route groups are invisible in URLs, so the rewrite targets a real path
 * prefix (`/admin/...`) that lives inside the group's folder. The browser URL
 * never changes.
 *
 * This runs on the edge: no database access, no Node crypto. The session guard
 * here is a cheap first gate; the authoritative check is in the admin layout,
 * which can reach the database.
 */
import { NextResponse, type NextRequest } from 'next/server';

type Surface = 'public' | 'admin' | 'checkout' | 'portal';

/** Maps the leftmost label of the host to a surface. */
const SUBDOMAIN_SURFACE: Record<string, Surface> = {
  admin: 'admin',
  payment: 'checkout',
  agency: 'portal',
  www: 'public',
};

/** Path prefix each surface's routes live behind. */
const SURFACE_PREFIX: Record<Surface, string> = {
  public: '',
  admin: '/admin',
  checkout: '/checkout',
  portal: '/portal',
};

function surfaceFor(hostname: string): Surface {
  // Strip the port: `admin.localhost:3000` → `admin.localhost`.
  const host = hostname.split(':')[0] ?? '';
  const labels = host.split('.');

  // Only the leftmost label matters, so `admin.localhost` in development and
  // `admin.softmato.com` in production take the same path — no env branching.
  //
  // A bare `localhost` or an apex domain has no surface label.
  if (labels.length < 2) return 'public';

  return SUBDOMAIN_SURFACE[labels[0] ?? ''] ?? 'public';
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const surface = surfaceFor(request.headers.get('host') ?? '');

  // Auth endpoints and the sign-in page are shared across surfaces and must not
  // be rewritten. Without /login here, the admin layout's redirect('/login')
  // lands on admin.softmato.com/login, gets rewritten to /admin/login, and
  // 404s — leaving no way to sign in from the admin subdomain at all.
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next();
  }

  const prefix = SURFACE_PREFIX[surface];

  // Already rewritten, or the public surface which needs no prefix.
  if (!prefix || pathname.startsWith(prefix)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `${prefix}${pathname === '/' ? '' : pathname}`;
  url.search = search;

  return NextResponse.rewrite(url);
}

export const config = {
  /**
   * Everything except Next internals, the API surface, and static files. The
   * API is excluded deliberately: `/api/v1`, `/api/callbacks`, and `/api/jobs`
   * authenticate by credential, not by subdomain.
   */
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico|.*\\..*).*)'],
};
