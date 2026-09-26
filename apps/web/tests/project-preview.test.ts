import { describe, expect, it } from 'vitest';

import { agencyOrigin } from '@/lib/portal/origin';

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
    for (const own of ['www', 'admin', 'agency', 'payment', 'api']) {
      expect(slugProblem(own), own).toMatch(/own addresses/);
    }
  });
});

describe('agencyOrigin', () => {
  it('puts the portal beside whichever host the site is on', () => {
    expect(agencyOrigin('http://localhost:3000')).toBe(
      'http://agency.localhost:3000',
    );
    expect(agencyOrigin('https://softmato.com')).toBe(
      'https://agency.softmato.com',
    );
    expect(agencyOrigin('https://www.softmato.com')).toBe(
      'https://agency.softmato.com',
    );
    expect(agencyOrigin('http://admin.localhost:3000')).toBe(
      'http://agency.localhost:3000',
    );
  });
});
