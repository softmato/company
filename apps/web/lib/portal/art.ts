/**
 * The 3D illustrations the portal borrows from the marketing site
 * (`public/home/`), named for what they show rather than where they came from.
 *
 * Decorative everywhere: each one sits beside words that say the same thing,
 * so every `<img>` of these carries `alt=""`.
 */
export const ART = {
  team: '/home/believe/clients.webp',
  shield: '/home/believe/shield.webp',
  handshake: '/home/believe/trust.webp',
  controls: '/home/believe/ui.webp',
  phone: '/home/believe/app.webp',
  database: '/home/believe/database.webp',
  server: '/home/believe/server.webp',
  browser: '/home/believe/web.webp',
  flow: '/home/believe/ux.webp',
} as const;

/** Wide scenes for banners. Width and height are the files' own. */
export const SCENES = {
  product: {
    src: '/home/services/product-engineering.webp',
    width: 1100,
    height: 758,
  },
  webApps: {
    src: '/home/services/web-applications.webp',
    width: 1100,
    height: 565,
  },
  uiux: { src: '/home/disciplines/uiux.webp', width: 720, height: 665 },
  web: { src: '/home/disciplines/web.webp', width: 720, height: 634 },
} as const;

const PROJECT_ART = [
  ART.browser,
  ART.phone,
  ART.controls,
  ART.flow,
  ART.database,
  ART.server,
];

/** A stable picture per project, so each card is recognisable at a glance. */
export function projectArt(projectId: number): string {
  return PROJECT_ART[projectId % PROJECT_ART.length]!;
}

const PROJECT_SCENES = [
  SCENES.web,
  SCENES.uiux,
  SCENES.webApps,
  SCENES.product,
];

export function projectScene(projectId: number) {
  return PROJECT_SCENES[projectId % PROJECT_SCENES.length]!;
}
