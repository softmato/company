import { NextResponse, type NextRequest } from 'next/server';
import { EsewaProviderAdapter } from '@softmato/payment-core';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const adapter = new EsewaProviderAdapter();
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
  const data = req.nextUrl.searchParams.get('data');
  const uuid = req.nextUrl.searchParams.get('uuid') || req.nextUrl.searchParams.get('transaction_uuid');

  const adapter = new EsewaProviderAdapter();
  try {
    const verified = await adapter.handleCallback({ data, uuid });
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
