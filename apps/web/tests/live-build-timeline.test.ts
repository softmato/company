/**
 * The home page's live build: what the editor, terminal and network panel
 * show at each step comes from the script alone, so a click can jump to any
 * step. These pin the derivation, and the two properties the drawing leans
 * on without checking — that every file it types is in the tree it draws,
 * and that typed code is ASCII (the caret sits at `col`ch).
 */
import { describe, expect, test } from 'vitest';

import { ASKS } from '@/lib/home/live-build-asks';
import { FILES, TREE, type TreeNode } from '@/lib/home/live-build-code';
import {
  indexOf,
  LAST,
  STEPS,
  timeline,
} from '@/lib/home/live-build-timeline';

const leaves = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((n) => (n.children ? leaves(n.children) : [n.path]));

describe('timeline', () => {
  test('opens page.tsx first, in the interface layer', () => {
    const t = timeline(0);
    expect(t.file).toBe('page');
    expect(t.layer).toBe('ui');
    expect(t.open).toEqual(['app']);
  });

  test('keeps the last file open through scenes that type nothing', () => {
    const t = timeline(indexOf('heroArt'));
    expect(t.file).toBe('hero');
    expect(t.fileStep).toBe(indexOf('hero'));
  });

  test('a second version of a file reuses its tab', () => {
    const { tabs } = timeline(indexOf('update'));
    expect(tabs.at(-1)).toBe('heroUpdate');
    expect(tabs).not.toContain('hero');
  });

  test('the server half closes the components folder', () => {
    const t = timeline(indexOf('api'));
    expect(t.layer).toBe('api');
    expect(t.open).toContain('app/api/orders');
    expect(t.open).not.toContain('components');
  });

  test('by the end every request is recorded and changed files are marked', () => {
    const t = timeline(LAST);
    expect(t.requests).toHaveLength(2 + STEPS.filter((s) => s.request).length);
    expect(t.status.get('next.config.ts')).toBe('modified');
    expect(t.status.get('app/api/orders/route.ts')).toBe('untracked');
  });
});

describe('the drawn project', () => {
  test('every file is in the explorer tree', () => {
    const tree = new Set(leaves(TREE));
    for (const { path } of Object.values(FILES)) expect(tree).toContain(path);
  });

  test('typed files are ASCII', () => {
    const typed = [
      ...STEPS.flatMap((s) => s.file ?? []),
      ...ASKS.map((a) => a.file),
    ];
    for (const file of typed)
      expect(FILES[file].code).toMatch(/^[\x20-\x7e\n]*$/);
  });
});
