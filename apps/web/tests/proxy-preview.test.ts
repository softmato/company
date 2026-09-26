import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from '@/proxy';

function hit(url: string) {
  const { host } = new URL(url);
  return proxy(new NextRequest(url, { headers: { host } }));
}

const rewrite = (url: string) => hit(url).headers.get('x-middleware-rewrite');

describe('preview hosts', () => {
  it('serves <slug>.softmato.com from /preview/<slug>, framed only by the portal', () => {
    const response = hit('https://himalayan-tea.softmato.com/shop');

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://himalayan-tea.softmato.com/preview/himalayan-tea/shop',
    );
    expect(response.headers.get('content-security-policy')).toBe(
      "frame-ancestors 'self' https://agency.softmato.com",
    );
    expect(response.headers.get('x-robots-tag')).toMatch(/noindex/);
  });

  it('does the same on localhost', () => {
    expect(rewrite('http://himalayan-tea.localhost:3000/')).toBe(
      'http://himalayan-tea.localhost:3000/preview/himalayan-tea',
    );
  });

  it('leaves our own hosts and other domains alone', () => {
    expect(rewrite('https://admin.softmato.com/')).toBe(
      'https://admin.softmato.com/admin',
    );
    expect(rewrite('https://agency.softmato.com/')).toBe(
      'https://agency.softmato.com/portal',
    );
    expect(rewrite('https://softmato.com/')).toBeNull();
    expect(rewrite('https://company-git-main.vercel.app/')).toBeNull();
  });
});
