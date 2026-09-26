/**
 * Phase 8 — the client portal (agency.softmato.com).
 *
 * **Tenant isolation lives in the queries, and the shape here is what makes
 * that cheap.** Every row a client can reach hangs off `projects.client_id`,
 * so one join answers "is this theirs" for a stage, a document or a message.
 * No child table carries its own `client_id`: a second copy is a second thing
 * that can disagree with the first (docs/RULES.md §6).
 *
 * Client accounts are separate from `admin_users` on purpose. An admin session
 * and a client session never share a table, a cookie or a code path, so a bug
 * in one cannot hand out the other.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { adminUsers } from './audit';
import { customers } from './customers';

export const projectStatus = pgEnum('project_status', [
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const stageStatus = pgEnum('stage_status', [
  'upcoming',
  'in_progress',
  'done',
]);

export const deliverableStatus = pgEnum('deliverable_status', [
  'in_progress',
  'in_review',
  'approved',
  'changes_requested',
]);

/** Who wrote a message or uploaded a document. */
export const portalParty = pgEnum('portal_party', ['admin', 'client']);

export const clients = pgTable(
  'clients',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    name: text('name').notNull(),
    /**
     * The `customers` row (product `agency`) this client's invoices are
     * issued to. Created with the client, so "which invoices are theirs" is a
     * foreign key rather than a name match.
     */
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .unique()
      .references(() => customers.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check('client_name_present', sql`length(trim(${t.name})) > 0`)],
);

export const clientUsers = pgTable(
  'client_users',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    clientId: bigint('client_id', { mode: 'number' })
      .notNull()
      .references(() => clients.id),
    /** Stored lowercased — the check makes `unique` mean case-insensitive. */
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    /** argon2id. Null until the invitation is accepted. */
    passwordHash: text('password_hash'),
    isActive: boolean('is_active').notNull().default(true),
    /** sha256 of the invitation token; the token itself is never stored. */
    inviteTokenHash: text('invite_token_hash').unique(),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('client_users_client_idx').on(t.clientId),
    check('client_email_lowercase', sql`${t.email} = lower(${t.email})`),
    check(
      'client_invite_pair',
      sql`(${t.inviteTokenHash} IS NULL) = (${t.inviteExpiresAt} IS NULL)`,
    ),
  ],
);

/**
 * Database sessions rather than a signed cookie, so deactivating a person or
 * archiving a client ends every session they hold at once.
 */
export const clientSessions = pgTable(
  'client_sessions',
  {
    /** sha256 of the cookie value. */
    id: text('id').primaryKey(),
    clientUserId: bigint('client_user_id', { mode: 'number' })
      .notNull()
      .references(() => clientUsers.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('client_sessions_user_idx').on(t.clientUserId)],
);

export const projects = pgTable(
  'projects',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    clientId: bigint('client_id', { mode: 'number' })
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    status: projectStatus('status').notNull().default('active'),
    startsOn: date('starts_on'),
    dueOn: date('due_on'),
    /** The `<slug>` of `<slug>.softmato.com`, where the site in progress is shown. */
    previewSlug: text('preview_slug'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('projects_client_idx').on(t.clientId),
    uniqueIndex('projects_preview_slug_unique').on(t.previewSlug),
    check(
      'project_preview_slug_label',
      sql`${t.previewSlug} IS NULL OR ${t.previewSlug} ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'`,
    ),
    check('project_name_present', sql`length(trim(${t.name})) > 0`),
    check(
      'project_dates_ordered',
      sql`${t.dueOn} IS NULL OR ${t.startsOn} IS NULL OR ${t.dueOn} >= ${t.startsOn}`,
    ),
  ],
);

/** The sequence a project moves through. Order is `position`, then `id`. */
export const projectStages = pgTable(
  'project_stages',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    status: stageStatus('status').notNull().default('upcoming'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('project_stages_project_idx').on(t.projectId, t.position),
    check('stage_name_present', sql`length(trim(${t.name})) > 0`),
  ],
);

export const projectMilestones = pgTable(
  'project_milestones',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    dueOn: date('due_on'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('project_milestones_project_idx').on(t.projectId),
    check('milestone_title_present', sql`length(trim(${t.title})) > 0`),
  ],
);

export const projectDeliverables = pgTable(
  'project_deliverables',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Where to see it — a staging site, a Figma file, a build. */
    linkUrl: text('link_url'),
    status: deliverableStatus('status').notNull().default('in_progress'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: bigint('reviewed_by', { mode: 'number' }).references(
      () => clientUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('project_deliverables_project_idx').on(t.projectId),
    check('deliverable_title_present', sql`length(trim(${t.title})) > 0`),
    check(
      'deliverable_link_http',
      sql`${t.linkUrl} IS NULL OR ${t.linkUrl} ~ '^https?://'`,
    ),
  ],
);

export const projectDocuments = pgTable(
  'project_documents',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** In the private bucket. Never public; reached by presigned URL only. */
    objectKey: text('object_key').notNull().unique(),
    fileName: text('file_name').notNull(),
    /** Decided by magic bytes at upload, never by the extension. */
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: portalParty('uploaded_by').notNull(),
    adminUserId: bigint('admin_user_id', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    clientUserId: bigint('client_user_id', { mode: 'number' }).references(
      () => clientUsers.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('project_documents_project_idx').on(t.projectId),
    check(
      'document_size_capped',
      sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 5242880`,
    ),
    check(
      'document_uploader_matches',
      sql`(${t.uploadedBy} = 'admin' AND ${t.adminUserId} IS NOT NULL AND ${t.clientUserId} IS NULL) OR (${t.uploadedBy} = 'client' AND ${t.clientUserId} IS NOT NULL AND ${t.adminUserId} IS NULL)`,
    ),
  ],
);

export const projectMessages = pgTable(
  'project_messages',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    author: portalParty('author').notNull(),
    adminUserId: bigint('admin_user_id', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    clientUserId: bigint('client_user_id', { mode: 'number' }).references(
      () => clientUsers.id,
    ),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('project_messages_project_idx').on(t.projectId, t.createdAt),
    check(
      'message_body_length',
      sql`length(trim(${t.body})) BETWEEN 1 AND 5000`,
    ),
    check(
      'message_author_matches',
      sql`(${t.author} = 'admin' AND ${t.adminUserId} IS NOT NULL AND ${t.clientUserId} IS NULL) OR (${t.author} = 'client' AND ${t.clientUserId} IS NOT NULL AND ${t.adminUserId} IS NULL)`,
    ),
  ],
);

export type Client = typeof clients.$inferSelect;
export type ClientUser = typeof clientUsers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectStage = typeof projectStages.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type ProjectDeliverable = typeof projectDeliverables.$inferSelect;
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type ProjectMessage = typeof projectMessages.$inferSelect;
