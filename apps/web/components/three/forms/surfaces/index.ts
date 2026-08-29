import { drawApp } from './app';
import { drawDesign } from './design';
import { drawProduct } from './product';
import { drawWebsite } from './website';

/**
 * The four surfaces the closing section's carousel turns through, in order.
 *
 * One per thing this company sells, and the order is the order the services
 * chapter uses: what we build, then what we build it on, then how it is drawn.
 * A visitor who scrolled past the services chapter should recognise all four
 * without reading the labels.
 *
 * `width` and `height` are the texture's pixel size and also its aspect on the
 * plane, so the phone is portrait and the other three are landscape without a
 * second number to keep in sync. Sized generously enough to stay crisp when a
 * panel is at the front of the carousel and small enough that four of them are
 * a couple of megabytes of texture memory, not a couple of dozen.
 */
export interface Surface {
  id: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export const SURFACES: Surface[] = [
  { id: 'websites', width: 760, height: 470, draw: drawWebsite },
  { id: 'apps', width: 380, height: 640, draw: drawApp },
  { id: 'products', width: 760, height: 470, draw: drawProduct },
  { id: 'interfaces', width: 760, height: 470, draw: drawDesign },
];
