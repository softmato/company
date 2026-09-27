/**
 * CMS — the editable content behind the public site (docs/PHASES.md, Phase 2).
 *
 * NOT translated from docs/schema.sql: that file is the money schema and has no
 * CMS tables. These are new, and deliberately typed one table per content kind
 * rather than a single generic `content_entries` with a JSON body. A founder
 * editing the refund policy should meet a form with the right fields on it, and
 * a public page should be able to read a column instead of validating a blob.
 *
 * Nothing here touches the ledger. These tables are ordinary mutable rows —
 * the immutability guarantees in docs/DATABASE.md apply to posted history, not
 * to marketing copy, and an accidental edit here costs a revert, not an audit
 * finding.
 *
 * One collision to keep in mind: `products` in ./accounts is a LEDGER
 * DIMENSION — `ledger_entries.product_id` is what makes product-level P&L
 * possible. The marketing page for a product is `product_pages` below, and it
 * REFERENCES that table. The two must never be merged: renaming a product for
 * a campaign must not be able to move posted revenue.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { products } from './accounts';
import { adminUsers } from './audit';

/**
 * Draft is invisible to the public site; published is live.
 *
 * Note the limitation this accepts: a row carries one body, so editing a
 * PUBLISHED page changes the live site on save. Draft-then-publish applies to
 * new content, which is what Phase 2 acceptance 3 asks for. If revising live
 * copy behind a draft is wanted later, that is a revisions table, not another
 * column — do not bolt a `draft_body` onto these.
 */
export const contentStatus = pgEnum('content_status', ['draft', 'published']);

/** Lowercase kebab-case, the only shape the public routes can address. */
const SLUG_PATTERN = '^[a-z0-9]+(-[a-z0-9]+)*$';

/**
 * Editable standalone pages: home, about, team, careers, contact, and the
 * index pages for services and products.
 *
 * The page must exist in the route tree to be reachable — creating a row does
 * not create a route. This table supplies copy for pages that already exist.
 */
export const pages = pgTable(
  'pages',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /** Markdown. Rendered server-side; never trusted as HTML. */
    body: text('body').notNull().default(''),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    ogImageUrl: text('og_image_url'),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'pages_slug_format',
      sql`${t.slug} ~ ${sql.raw(`'${SLUG_PATTERN}'`)}`,
    ),
    index('pages_status_idx').on(t.status),
  ],
);

export type Page = typeof pages.$inferSelect;

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /** Shown in listings and used as the OG description fallback. */
    excerpt: text('excerpt'),
    body: text('body').notNull().default(''),
    coverImageUrl: text('cover_image_url'),
    /** Free-form tags; no separate taxonomy table until one is needed. */
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    authorId: bigint('author_id', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    status: contentStatus('status').notNull().default('draft'),
    /** Set when first published. Drives ordering on the blog index. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'blog_posts_slug_format',
      sql`${t.slug} ~ ${sql.raw(`'${SLUG_PATTERN}'`)}`,
    ),
    /** A published post without a date would sort unpredictably. */
    check(
      'blog_posts_published_has_date',
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    index('blog_posts_published_idx').on(t.status, t.publishedAt),
  ],
);

export type BlogPost = typeof blogPosts.$inferSelect;

export const teamMembers = pgTable(
  'team_members',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    bio: text('bio'),
    /** R2 public bucket, `company/images/{uuid}-{slug}.{ext}` (ENVIRONMENT.md §3). */
    photoUrl: text('photo_url'),
    email: text('email'),
    linkedinUrl: text('linkedin_url'),
    githubUrl: text('github_url'),
    /** Ascending. Ties broken by name. */
    sortOrder: integer('sort_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    /** Someone who has left stops showing without deleting the record. */
    isActive: boolean('is_active').notNull().default(true),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('team_members_display_idx').on(t.status, t.sortOrder)],
);

export type TeamMember = typeof teamMembers.$inferSelect;

export const services = pgTable(
  'services',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /** One or two lines, for the services index. */
    summary: text('summary'),
    body: text('body').notNull().default(''),
    /** Icon name from the design system, not a URL. */
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'services_slug_format',
      sql`${t.slug} ~ ${sql.raw(`'${SLUG_PATTERN}'`)}`,
    ),
    index('services_display_idx').on(t.status, t.sortOrder),
  ],
);

export type Service = typeof services.$inferSelect;

/**
 * Marketing copy for a SaaS product.
 *
 * `productId` references the ledger dimension in ./accounts — one marketing
 * page per product, and a page cannot exist for a product the books have never
 * heard of. Deliberately no ON DELETE CASCADE: a product with posted history
 * cannot be deleted anyway, and silently dropping its page would hide that.
 */
export const productPages = pgTable(
  'product_pages',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    /** Usually the product id, but free to differ for a campaign URL. */
    slug: text('slug').notNull().unique(),
    /** Display name for the site. The ledger's name stays in `products`. */
    title: text('title').notNull(),
    tagline: text('tagline'),
    body: text('body').notNull().default(''),
    logoUrl: text('logo_url'),
    screenshotUrl: text('screenshot_url'),
    /** Where the product actually lives, if it is externally hosted. */
    siteUrl: text('site_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('product_pages_product_key').on(t.productId),
    check(
      'product_pages_slug_format',
      sql`${t.slug} ~ ${sql.raw(`'${SLUG_PATTERN}'`)}`,
    ),
    index('product_pages_display_idx').on(t.status, t.sortOrder),
  ],
);

export type ProductPage = typeof productPages.$inferSelect;

/**
 * Terms, privacy, refunds, SLA, acceptable use, cookies, candidate privacy.
 *
 * These differ from `pages` in one way that matters: what a customer agreed to
 * on a given date must stay knowable. Rows are versioned and superseded rather
 * than overwritten — `version` increments and the old row keeps its
 * `effectiveAt`, so "which refund policy applied on 3 Bhadra" has an answer.
 * The public route serves the highest-version published row for a slug.
 */
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    /** 'terms', 'privacy', 'refunds', 'sla', 'aup', 'cookies'. */
    slug: text('slug').notNull(),
    version: integer('version').notNull().default(1),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    /** When this version took effect. Shown on the page. */
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('legal_documents_slug_version_key').on(t.slug, t.version),
    check(
      'legal_documents_slug_format',
      sql`${t.slug} ~ ${sql.raw(`'${SLUG_PATTERN}'`)}`,
    ),
    check('legal_documents_version_positive', sql`${t.version} > 0`),
    /** A published policy with no effective date is not usable evidence. */
    check(
      'legal_documents_published_has_date',
      sql`${t.status} <> 'published' OR ${t.effectiveAt} IS NOT NULL`,
    ),
    index('legal_documents_lookup_idx').on(t.slug, t.status, t.version),
  ],
);

export type LegalDocument = typeof legalDocuments.$inferSelect;

/**
 * Contact form submissions (docs/PRD.md §5.1).
 *
 * Stored as well as emailed, so a delivery failure does not lose an enquiry.
 * The honeypot rejects before insert; the rate limit is keyed on `ipHash`.
 * The raw IP is never stored — it is personal data with no use here that a
 * hash cannot serve.
 */
export const contactSubmissions = pgTable(
  'contact_submissions',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    subject: text('subject'),
    message: text('message').notNull(),
    /** SHA-256 of the source IP, for rate limiting only. */
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    /** Set when a founder has dealt with it. */
    handledAt: timestamp('handled_at', { withTimezone: true }),
    handledBy: bigint('handled_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('contact_submissions_created_idx').on(t.createdAt),
    index('contact_submissions_rate_idx').on(t.ipHash, t.createdAt),
  ],
);

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
