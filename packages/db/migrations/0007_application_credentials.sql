-- One application, two credential sets.
--
-- `is_live` was a column on `applications`, so a Sandbox credential and a
-- Production credential were two unrelated rows with two unrelated names.
-- Nothing linked them. This splits what an integration *is* from how it
-- authenticates, and moves the domain allowlist onto the credential — a test
-- credential must not be able to send a customer to the production site.
--
-- **Hand-written, and it must stay that way.** `drizzle-kit generate` diffs
-- against the newest snapshot in `meta/`, and there is no `0006_snapshot.json`
-- — migration 0006 was hand-written and never recorded one. So the generator's
-- baseline is 0005, which predates `application_domains` entirely, and it
-- emitted `CREATE TABLE "application_domains"` for a table that already
-- exists. That statement would fail on every database that has run 0006.
--
-- The generated *snapshot* (`meta/0007_snapshot.json`) is correct — it is
-- built from the schema files, not from the diff — so it is kept, and the
-- drift heals from here: the next `generate` has a truthful baseline.
--
-- The data migration is in this file on purpose. A migration that needs
-- somebody to remember to run a script afterwards is a migration that will be
-- half-applied on the one database nobody was watching.

CREATE TYPE "public"."credential_mode" AS ENUM('test', 'live');--> statement-breakpoint

CREATE TABLE "application_credentials" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_credentials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"application_id" bigint NOT NULL,
	"mode" "credential_mode" NOT NULL,
	"client_id" text NOT NULL,
	"secret_hash" text NOT NULL,
	"secret_last4" text NOT NULL,
	"previous_secret_hash" text,
	"previous_secret_last4" text,
	"previous_secret_expires_at" timestamp with time zone,
	"webhook_secret" text,
	"webhook_url" text,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_credentials_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "application_credentials_mode_key" UNIQUE("application_id","mode"),
	CONSTRAINT "previous_secret_complete" CHECK (("application_credentials"."previous_secret_hash" IS NULL AND "application_credentials"."previous_secret_last4" IS NULL AND "application_credentials"."previous_secret_expires_at" IS NULL)
          OR ("application_credentials"."previous_secret_hash" IS NOT NULL AND "application_credentials"."previous_secret_last4" IS NOT NULL AND "application_credentials"."previous_secret_expires_at" IS NOT NULL)),
	CONSTRAINT "client_id_matches_mode" CHECK ("application_credentials"."client_id" LIKE 'app_' || "application_credentials"."mode"::TEXT || '\_%')
);
--> statement-breakpoint

ALTER TABLE "application_credentials" ADD CONSTRAINT "application_credentials_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "application_credentials_application_idx" ON "application_credentials" USING btree ("application_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- The data. Every existing application becomes one application plus one
-- credential carrying its current `is_live` as `mode`, with its client id,
-- hashes and webhook secret unchanged. An issued secret that stops
-- authenticating after this is a failed migration, not an acceptable cost.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "application_credentials" (
	"application_id", "mode", "client_id", "secret_hash", "secret_last4",
	"previous_secret_hash", "previous_secret_last4", "previous_secret_expires_at",
	"webhook_secret", "webhook_url", "rotated_at", "revoked_at", "created_at"
)
SELECT
	"id",
	(CASE WHEN "is_live" THEN 'live' ELSE 'test' END)::"credential_mode",
	"client_id", "secret_hash", "secret_last4",
	"previous_secret_hash", "previous_secret_last4", "previous_secret_expires_at",
	"webhook_secret", "webhook_url", "rotated_at", "revoked_at", "created_at"
FROM "applications";--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- Domains move from the application to the credential.
--
-- Added nullable, backfilled, then made NOT NULL — the three-step shape, so a
-- row that failed to find its credential stops the migration at the NOT NULL
-- rather than being silently dropped. Every application has exactly one
-- credential at this point, so the join cannot be ambiguous.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "application_domains" ADD COLUMN "credential_id" bigint;--> statement-breakpoint

UPDATE "application_domains" AS d
SET "credential_id" = c."id"
FROM "application_credentials" AS c
WHERE c."application_id" = d."application_id";--> statement-breakpoint

ALTER TABLE "application_domains" ALTER COLUMN "credential_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "application_domains" DROP CONSTRAINT IF EXISTS "application_domains_application_id_applications_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "application_domains_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "application_domains_application_idx";--> statement-breakpoint
ALTER TABLE "application_domains" DROP COLUMN "application_id";--> statement-breakpoint

ALTER TABLE "application_domains" ADD CONSTRAINT "application_domains_credential_id_application_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."application_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "application_domains_unique" ON "application_domains" USING btree ("credential_id","hostname");--> statement-breakpoint
CREATE INDEX "application_domains_credential_idx" ON "application_domains" USING btree ("credential_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- Last, and only now that everything has been copied out of them: the columns
-- that described a credential rather than an integration.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "applications_client_id_unique";--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "previous_secret_complete";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "client_id";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "secret_hash";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "secret_last4";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "webhook_url";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "webhook_secret";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "previous_secret_hash";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "previous_secret_last4";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "previous_secret_expires_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "is_live";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "rotated_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "revoked_at";
