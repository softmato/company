import Image from 'next/image';

import { BRAND_MARK_192 } from '@/lib/brand/assets';

export default function PreviewNotFound() {
  return (
    <main className="grid flex-1 place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)] px-6 py-24 text-center">
      <div>
        <Image
          src={BRAND_MARK_192}
          alt=""
          width={56}
          height={56}
          className="mx-auto"
        />
        <h1 className="headline mt-6 text-[28px]">
          Nothing to preview here yet
        </h1>
        <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
          This address is kept for a site Softmato is building. It appears here
          as soon as the first build is up.
        </p>
        <a
          href="https://softmato.com"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          softmato.com
        </a>
      </div>
    </main>
  );
}
