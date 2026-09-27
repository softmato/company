import { describe, expect, it } from 'vitest';

import { portalOrigin } from '@/lib/portal/origin';

import { previewUrl, slugProblem, suggestSlug } from '@/lib/projects/preview';

describe('preview slugs', () => {
  it('suggests a DNS label from a project name', () => {
    expect(suggestSlug('Himalayan Tea Co. — Website')).toBe(
      'himalayan-tea-co-website',
    );
    expect(suggestSlug('  Café 2.0!  ')).toBe('cafe-2-0');
  });

  it('accepts a plain label and builds its address', () => {
    expect(slugProblem('himalayan-tea')).toBeNull();
    expect(previewUrl('himalayan-tea')).toBe(
      'https://himalayan-tea.softmato.com',
    );
    expect(previewUrl('himalayan-tea', 'http://localhost:3000')).toBe(
      'http://himalayan-tea.localhost:3000',
    );
    expect(previewUrl('himalayan-tea', 'https://www.softmato.com')).toBe(
      'https://himalayan-tea.softmato.com',
    );
  });

  it('refuses anything that is not one DNS label', () => {
    for (const bad of [
      '',
      '-tea',
      'tea-',
      'Tea',
      'tea.co',
      'tea_co',
      'a'.repeat(64),
    ]) {
      expect(slugProblem(bad), bad).not.toBeNull();
    }
  });

  it("refuses Softmato's own hosts", () => {
    for (const own of ['www', 'admin', 'client', 'agency', 'payment', 'api']) {
      expect(slugProblem(own), own).toMatch(/own addresses/);
    }
  });
});

describe('portalOrigin', () => {
  it('puts the portal beside whichever host the site is on', () => {
    expect(portalOrigin('http://localhost:3000')).toBe(
      'http://client.localhost:3000',
    );
    expect(portalOrigin('https://softmato.com')).toBe(
      'https://client.softmato.com',
    );
    expect(portalOrigin('https://www.softmato.com')).toBe(
      'https://client.softmato.com',
    );
    expect(portalOrigin('http://admin.localhost:3000')).toBe(
      'http://client.localhost:3000',
    );
  });
});
