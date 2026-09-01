import { NextResponse } from 'next/server';
import { getAllLeads, updateLeadStatus } from '@/lib/ai/leads-store';

export async function GET() {
  try {
    const leads = getAllLeads();
    return NextResponse.json({ success: true, leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leads';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
    }

    const updated = updateLeadStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update lead status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
