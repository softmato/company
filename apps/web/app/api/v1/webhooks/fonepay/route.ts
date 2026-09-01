import { NextResponse, type NextRequest } from 'next/server';
import { FonepayProviderAdapter } from '@softmato/payment-core';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const adapter = new FonepayProviderAdapter();
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
  const prn = req.nextUrl.searchParams.get('PRN') || req.nextUrl.searchParams.get('prn');
  if (!prn) {
    return NextResponse.json({ error: 'Missing PRN query parameter' }, { status: 400 });
  }

  const adapter = new FonepayProviderAdapter();
  try {
    const verified = await adapter.handleCallback({ PRN: prn });
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
