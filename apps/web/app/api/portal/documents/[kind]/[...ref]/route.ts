/**
 * `/api/portal/documents/invoice/INV-2083/84-000010?format=pdf` — a client's
 * own invoice or receipt.
 *
 * Ownership is decided before anything is rendered: the invoice (or the
 * invoice a receipt settles) must belong to the signed-in client's customer
 * record. Anyone else's number is a 404, exactly like a number that does not
 * exist.
 */
import { documentResponse, isDocumentKind } from '@/lib/documents/serve';
import { clientOwnsInvoice, clientOwnsReceipt } from '@/lib/portal/invoices';
import { currentViewer } from '@/lib/portal/session';

export const dynamic = 'force-dynamic';

/** First render of a PDF may launch Chrome; see the admin route. */
export const maxDuration = 60;

const notFound = () =>
  Response.json(
    { error: { code: 'NOT_FOUND', message: 'No such document.' } },
    { status: 404 },
  );

export async function GET(
  request: Request,
  context: RouteContext<'/api/portal/documents/[kind]/[...ref]'>,
) {
  const viewer = await currentViewer();

  if (!viewer) {
    return Response.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in to the client portal.',
        },
      },
      { status: 401 },
    );
  }

  const { kind, ref } = await context.params;
  const reference = ref.map(decodeURIComponent).join('/');

  if (!isDocumentKind(kind)) return notFound();

  const owned =
    kind === 'invoice'
      ? await clientOwnsInvoice(viewer.customerId, reference)
      : await clientOwnsReceipt(viewer.customerId, reference);

  if (!owned) return notFound();

  return (await documentResponse(kind, reference, request)) ?? notFound();
}
