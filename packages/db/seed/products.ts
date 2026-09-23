/**
 * Product dimension — docs/CHART_OF_ACCOUNTS.md §8.
 *
 * These are ledger dimensions, not accounts. Adding a product is a row insert
 * and never touches the chart of accounts.
 */
import type { products } from '../schema/accounts';

type ProductSeed = typeof products.$inferInsert;

export const productSeeds: ProductSeed[] = [
  { id: 'hostelhub', name: 'HostelPalika', kind: 'saas' },
  { id: 'questioncall', name: 'QuestionCall', kind: 'saas' },
  { id: 'agency', name: 'Project & Design Work', kind: 'agency' },
  {
    id: 'corporate',
    name: 'Shared / Unattributable Overhead',
    kind: 'corporate',
  },
];
