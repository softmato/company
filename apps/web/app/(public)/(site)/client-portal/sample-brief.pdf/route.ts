import { sampleBriefPdf } from '@/lib/portal/sample-brief';

/** The portal demo's sample file, built once at deploy and served as a download. */
export const dynamic = 'force-static';

export async function GET() {
  return new Response(new Uint8Array(await sampleBriefPdf()), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="sample-brief.pdf"',
    },
  });
}
