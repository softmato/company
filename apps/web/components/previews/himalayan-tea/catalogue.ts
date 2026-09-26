/**
 * The Himalayan Tea Co. preview's catalogue — the sample client's own data,
 * the way a drawn invoice carries its own amount. Nothing here is Softmato's
 * claim about itself, and nothing is for sale: the preview places no orders.
 */
export type TeaKind = 'Black' | 'Green' | 'Oolong' | 'White' | 'Chai';

export interface Tea {
  id: string;
  name: string;
  kind: TeaKind;
  garden: string;
  notes: string;
  /** Rupees per 100 g tin. */
  price: number;
  /** Rupees per carton of 20 tins, on the wholesale price list. */
  carton: number;
  tin: { body: string; lid: string; label: string; ink: string };
  featured?: boolean;
}

export const TEAS: Tea[] = [
  {
    id: 'first-flush',
    name: 'First Flush',
    kind: 'Black',
    garden: 'Ilam',
    notes: 'Bright, floral, a little muscatel. The first spring picking.',
    price: 850,
    carton: 13600,
    tin: { body: '#2f6b4f', lid: '#1f4a36', label: '#f3ead8', ink: '#1f4a36' },
    featured: true,
  },
  {
    id: 'second-flush',
    name: 'Second Flush',
    kind: 'Black',
    garden: 'Ilam',
    notes: 'Rounder and darker, honey and stone fruit. The summer picking.',
    price: 780,
    carton: 12480,
    tin: { body: '#8a4b2a', lid: '#633217', label: '#f6e7cf', ink: '#633217' },
    featured: true,
  },
  {
    id: 'kanyam-green',
    name: 'Kanyam Green',
    kind: 'Green',
    garden: 'Kanyam',
    notes: 'Pan-fired, grassy and sweet. Brew it cooler than you think.',
    price: 690,
    carton: 11040,
    tin: { body: '#7aa35a', lid: '#58803c', label: '#f4f1df', ink: '#3e5f28' },
    featured: true,
  },
  {
    id: 'himalayan-oolong',
    name: 'Himalayan Oolong',
    kind: 'Oolong',
    garden: 'Dhankuta',
    notes: 'Half-oxidised, toasted, with a long peachy finish.',
    price: 1150,
    carton: 18400,
    tin: { body: '#2b6f73', lid: '#1b4d50', label: '#eef2ea', ink: '#1b4d50' },
    featured: true,
  },
  {
    id: 'silver-tips',
    name: 'Silver Tips',
    kind: 'White',
    garden: 'Ilam',
    notes: 'Downy buds, barely processed. Delicate, melon and hay.',
    price: 1650,
    carton: 26400,
    tin: { body: '#d9cdb4', lid: '#b8a888', label: '#fbf8f0', ink: '#6d5d3f' },
  },
  {
    id: 'masala-chai',
    name: 'Masala Chai',
    kind: 'Chai',
    garden: 'Ilam',
    notes: 'CTC black with cardamom, clove, ginger and cinnamon.',
    price: 520,
    carton: 8320,
    tin: { body: '#b5432f', lid: '#8a2c1c', label: '#f8e9d6', ink: '#8a2c1c' },
  },
  {
    id: 'golden-ilam',
    name: 'Golden Ilam',
    kind: 'Black',
    garden: 'Ilam',
    notes: 'Golden-tipped autumn tea. Malty, cocoa, very smooth.',
    price: 940,
    carton: 15040,
    tin: { body: '#c8862a', lid: '#9c6417', label: '#fbf1dd', ink: '#7a4d10' },
  },
  {
    id: 'jasmine-green',
    name: 'Jasmine Green',
    kind: 'Green',
    garden: 'Kanyam',
    notes: 'Green tea layered with jasmine blossom overnight.',
    price: 740,
    carton: 11840,
    tin: { body: '#9a7fb8', lid: '#72589a', label: '#f6f1f8', ink: '#5a4080' },
  },
];

export const KINDS: TeaKind[] = ['Black', 'Green', 'Oolong', 'White', 'Chai'];

export const rupees = (n: number) =>
  `Rs ${new Intl.NumberFormat('en-IN').format(n)}`;
