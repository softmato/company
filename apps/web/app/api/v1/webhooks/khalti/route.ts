import { NextResponse, type NextRequest } from 'next/server';
import { KhaltiProviderAdapter } from '@softmato/payment-core';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const adapter = new KhaltiProviderAdapter();
    const verified = await adapter.handleCallback(body);

    return NextResponse.json({
      success: true,
      status: verified.status,
      grossAmountMinor: verified.grossAmountMinor.toString(),
      providerTxnId: verified.providerTxnId,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Webhook processing failed' },
      { status: 400 },
    );
  }
}

export async function GET(req: NextRequest) {
  const pidx = req.nextUrl.searchParams.get('pidx');
  if (!pidx) {
    return NextResponse.json({ error: 'Missing pidx query parameter' }, { status: 400 });
  }

  const adapter = new KhaltiProviderAdapter();
  try {
    const verified = await adapter.handleCallback({ pidx });
    return NextResponse.json({
      success: true,
      status: verified.status,
      grossAmountMinor: verified.grossAmountMinor.toString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 },
    );
  }
}
