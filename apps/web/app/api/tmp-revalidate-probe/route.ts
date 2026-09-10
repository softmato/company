// TEMPORARY — local verification only. Deleted before commit.
import { NextResponse } from 'next/server';

import { revalidateContent } from '@/app/(admin)/admin/cms/actions/revalidate';

export async function GET() {
  revalidateContent('team');
  return NextResponse.json({ ok: true });
}
