import type { ReactNode } from 'react';

import type { ProcessStep } from '@/lib/process/steps';

import { Hub, Node } from '../services/service-art';

/**
 * One mark per step of `/how-we-work`, in the services hand: ink on a 64
 * grid, 1.75 stroke, one hub with the brand dot. New drawings — no other page
 * shows these.
 */
export const STEP_MARKS: Record<ProcessStep['key'], ReactNode> = {
  // Two speech bubbles, the hub in the one in front.
  talk: (
    <>
      <path d="M30 24h25a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-3v8l-9-8H30a5 5 0 0 1-5-5V29a5 5 0 0 1 5-5Z" />
      <path
        d="M9 8h26a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H21l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5Z"
        className="fill-card"
      />
      <Hub x={22} y={20} />
    </>
  ),
  // A door left open for you, the hub its handle.
  access: (
    <>
      <path d="M8 56h48M18 56V10a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v46" />
      <path d="m18 8 18 6v46l-18-4Z" className="fill-card" />
      <Hub x={29} y={36} />
    </>
  ),
  // A screen and a phone showing the same preview.
  build: (
    <>
      <rect x={4} y={10} width={42} height={30} rx={4} />
      <path d="M18 50h14M25 40v10" />
      <rect x={40} y={22} width={20} height={34} rx={4} className="fill-card" />
      <path d="M47 27h6M40 48h20" />
      <Hub x={22} y={25} />
    </>
  ),
  // A bell, the hub its notification.
  updates: (
    <>
      <path d="M16 44V28a16 16 0 0 1 32 0v16l4 6H12Z" />
      <path d="M27 50a5 5 0 0 0 10 0M32 8v4" />
      <Hub x={46} y={16} />
    </>
  ),
  // A rocket lifting off, the hub its window.
  launch: (
    <>
      <path d="M32 6c10 8 12 20 10 34H22C20 26 22 14 32 6Z" />
      <path d="m22 30-8 8v8l8-4M42 30l8 8v8l-8-4M27 46v6M32 46v10M37 46v6" />
      <Hub x={32} y={24} />
    </>
  ),
  // A repository branching off to its new home.
  code: (
    <>
      <path d="M18 14v36M46 24c0 12-28 8-28 22" />
      <Node x={18} y={10} />
      <Node x={18} y={54} />
      <Hub x={46} y={18} />
    </>
  ),
  // A seedling kept growing, the hub its bud.
  care: (
    <>
      <path d="M20 40h24l-3 16H23ZM32 40V21" />
      <path d="M32 32c-9 0-14-5-14-13 9 0 14 5 14 13ZM32 26c0-8 5-13 14-13 0 8-5 13-14 13Z" />
      <Hub x={32} y={16} />
    </>
  ),
};
