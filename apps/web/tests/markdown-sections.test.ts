import { describe, expect, it } from 'vitest';

import { bulletHighlights, splitSections } from '@/lib/markdown/sections';

const BODY = `A phone is where most people meet your software.

## What we build

- **One codebase, both stores** — iOS and Android from the same source,
  so a fix ships to both
- **Accounts and sync** — data that is there in flight mode
- Plain item

## What we will tell you first

Most first apps do not need to be apps.`;

describe('splitSections', () => {
  it('lifts the lede and cuts the rest at ## headings', () => {
    const { lede, sections } = splitSections(BODY);
    expect(lede).toBe('A phone is where most people meet your software.');
    expect(sections.map((s) => s.title)).toEqual([
      'What we build',
      'What we will tell you first',
    ]);
    expect(sections[1]!.body).toBe('Most first apps do not need to be apps.');
  });

  it('keeps prose before the first heading as an untitled section', () => {
    expect(splitSections('Lede.\n\nMore prose.').sections).toEqual([
      { title: '', body: 'More prose.' },
    ]);
  });

  it('returns no sections for an empty body', () => {
    expect(splitSections(null)).toEqual({ lede: null, sections: [] });
  });
});

describe('bulletHighlights', () => {
  it('takes the titled half of each bullet, joining wrapped lines', () => {
    expect(bulletHighlights(BODY)).toEqual([
      'One codebase, both stores',
      'Accounts and sync',
      'Plain item',
    ]);
    expect(bulletHighlights(BODY, 1)).toEqual(['One codebase, both stores']);
  });
});
