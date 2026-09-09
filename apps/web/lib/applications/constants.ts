/**
 * The handful of literals the register form and its server action both have to
 * agree on.
 *
 * Its own module because neither side can host it. `actions.ts` is
 * `'use server'`, which may only export async functions, and `result.ts` is
 * `import 'server-only'`, which a client component cannot touch. A constant
 * that two files must agree on and that neither can export is exactly the one
 * that ends up written out twice and changed once.
 */

/**
 * What the product `<select>` submits when the admin chose to create a product
 * rather than pick one.
 *
 * It cannot collide with a real id: `normalizeProductId` accepts only
 * lowercase letters, digits and single hyphens, so no product is ever called
 * `__new__`.
 */
export const NEW_PRODUCT = '__new__';
