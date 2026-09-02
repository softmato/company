/**
 * Subdomain → route group rewriting (docs/ARCHITECTURE.md §1).
 *
 *   softmato.com            → (public)
 *   admin.softmato.com      → (admin)
 *   payment.softmato.com    → (checkout)
 *   agency.softmato.com     → (portal)
 *   developer.softmato.com  → (public), rooted at /developers
 *
 * Route groups are invisible in URLs, so the rewrite targets a real path
 * prefix (`/admin/...`) that lives inside the group's folder. The browser URL
 * never changes.
 *
 * This runs on every matched request on the Node.js runtime (the `proxy` file
 * convention, which replaced `middleware` in Next 16, has no edge variant).
 * Keep it cheap and free of database access anyway: the authoritative session
 * check belongs in the admin layout, which can reach the database.
 */
import { NextResponse, type NextRequest } from 'next/server';

type Surface = 'public' | 'admin' | 'checkout' | 'portal';

/** Maps the leftmost label of the host to a surface. */
const SUBDOMAIN_SURFACE: Record<string, Surface> = {
  admin: 'admin',
  payment: 'checkout',
  agency: 'portal',
  www: 'public',
  /*
   * The documentation host is the **public** surface, not a fifth one, and
   * that is the whole trick — see `DOCUMENTATION_HOSTS` below.
   */
  developer: 'public',
  developers: 'public',
};

/**
 * Hosts whose *root* is the developer documentation.
 *
 * Unlike the other subdomains, this one does not prefix every path. It rewrites
 * `/` to `/developers` and lets everything else through to the public site
 * unchanged, because the documentation links out to `/legal/partner-terms` and
 * the two pages link to each other — under a blanket prefix that link would
 * become `/developers/legal/partner-terms` and 404.
 *
 * `softmato.com/developers` therefore keeps working, and stays the canonical
 * URL: it is the only address that exists in local development and in preview
 * deployments, where no `developer.` host is ever pointed at anything. A
 * rewrite that made the path stop working would make the page untestable
 * everywhere except production.
 *
 * **DNS is not code.** The subdomain still needs a CNAME to Vercel and the
 * domain added to the project. Until then this is inert and the path is the
 * only way in.
 */
const DOCUMENTATION_HOSTS = new Set(['developer', 'developers']);

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

function isDocumentationHost(hostname: string): boolean {
  const host = hostname.split(':')[0] ?? '';
  const labels = host.split('.');

  return labels.length >= 2 && DOCUMENTATION_HOSTS.has(labels[0] ?? '');
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') ?? '';
  const surface = surfaceFor(host);

  if (pathname === '/' && isDocumentationHost(host)) {
    const url = request.nextUrl.clone();
    url.pathname = '/developers';
    url.search = search;

    return NextResponse.rewrite(url);
  }

  // Auth endpoints, the sign-in page and TOTP enrolment are shared across
  // surfaces and must not be rewritten. Without /login here, the admin layout's
  // redirect('/login') lands on admin.softmato.com/login, gets rewritten to
  // /admin/login, and 404s — leaving no way to sign in from the admin subdomain
  // at all. /enrol is the same trap: the link is opened on whichever host the
  // recipient was sent, and under the admin surface it would become
  // /admin/enrol, hit the layout's session guard, and bounce a new admin to a
  // login they cannot yet pass.
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/enrol'
  ) {
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
