import type { ReactNode } from 'react';

import { Hub, Node } from '../services/service-art';

/**
 * One mark per section of the about page, keyed by its `##` heading and drawn
 * in the plans and services hand: ink on a 64 grid, 1.75 stroke, one hub with
 * the brand dot. `Markdown` sets each over its heading; a heading with no mark
 * gets none — never another page's.
 */
export const ABOUT_MARKS: Record<string, ReactNode> = {
  // Products and project work: two rings, the hub where they cross.
  'Two kinds of work, one company': (
    <>
      <circle cx={23} cy={32} r={16} />
      <circle cx={41} cy={32} r={16} />
      <Hub x={32} y={18.8} />
    </>
  ),
  // A spirit level, the hub its bubble dead centre — correct, and boring.
  'What we believe about software': (
    <>
      <rect x={4} y={20} width={56} height={24} rx={6} />
      <rect x={20} y={25} width={24} height={14} rx={7} />
      <Node x={11} y={32} r={2.5} />
      <Node x={53} y={32} r={2.5} />
      <Hub x={32} y={32} />
    </>
  ),
  // A long climb, flag at the top.
  'Where we are going': (
    <>
      <path d="M4 54 26 22l9 13 7-9 18 28Z" />
      <path d="M26 22V6l11 4-11 4" />
      <Hub x={26} y={22} />
    </>
  ),
};
