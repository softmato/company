/**
 * `/api/internal/documents/invoice/INV-2083/84-000010?format=pdf`
 *
 * Serves an invoice or a receipt as a standalone HTML file or as a PDF. Admin
 * only — these are somebody's financial records, and the route is behind the
 * same session-plus-MFA check the admin pages are. The rendering itself is
 * `lib/documents/serve.ts`, shared with the client portal's own route.
 */
import { auth } from '@/lib/auth';
import { documentResponse, isDocumentKind } from '@/lib/documents/serve';

export const dynamic = 'force-dynamic';

/**
 * Chrome may launch on this request; the default 15s is not enough on a cold
 * host. A document already rendered into the private bucket comes back as a
 * read — this budget is for the first render of a given version.
 */
export const maxDuration = 60;

/** Functions, not constants: a Response body can be read only once. */
const unauthorized = () =>
  Response.json(
    { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
    { status: 401 },
  );

const notFound = () =>
  Response.json(
    { error: { code: 'NOT_FOUND', message: 'No such document.' } },
    { status: 404 },
  );

export async function GET(
  request: Request,
  context: RouteContext<'/api/internal/documents/[kind]/[...ref]'>,
) {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) return unauthorized();

  const { kind, ref } = await context.params;
  // The number is one identifier split across segments by its own slash.
  const reference = ref.map(decodeURIComponent).join('/');

  if (!isDocumentKind(kind)) return notFound();

  return (await documentResponse(kind, reference, request)) ?? notFound();
}
