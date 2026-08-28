/**
 * First letters of the first two words. `Rukesh Bhandari` → `RB`.
 *
 * Used wherever an image is optional and often absent — team photos, product
 * logos. An initials tile is a deliberate stand-in that says "this person has
 * no photo yet"; a grey silhouette says "this person is a placeholder", which
 * is not the same thing and reads worse on an About page.
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}
