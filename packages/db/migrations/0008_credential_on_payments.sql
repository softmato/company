-- Which credential made this payment.
--
-- 0007 moved `webhook_url` and `webhook_secret` onto `application_credentials`,
-- which leaves one question unanswered: when a payment settles, whose endpoint
-- do we notify? The application is the ledger dimension and now has up to two
-- credentials with two different webhook addresses.
--
-- Deriving it from the session id's `cs_test_` / `cs_live_` prefix would be a
-- guess dressed as a lookup, and it does not work at all for a transaction
-- with no session. So the credential is recorded where the payment is.
--
-- On `webhook_deliveries` it is the credential whose secret produced the
-- stored `signature`. Kept on the row rather than resolved at send time: a
-- rotation between enqueue and delivery must not change which key a queued row
-- was signed with, and a retry hours later has to reach the same place.
--
-- All three are nullable. A session raised in the admin panel has no
-- credential behind it and nobody to notify, which is normal rather than a
-- fault, and the backfill below cannot invent one for a historical row whose
-- application was deleted.

ALTER TABLE "payment_sessions" ADD COLUMN "credential_id" bigint;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "credential_id" bigint;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "credential_id" bigint;--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill. Immediately after 0007 every application has exactly one
-- credential, so the join cannot be ambiguous — and it stops being true the
-- moment a second credential is minted, which is why this runs here and not
-- later.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "payment_sessions" AS s
SET "credential_id" = c."id"
FROM "application_credentials" AS c
WHERE c."application_id" = s."application_id";--> statement-breakpoint

UPDATE "transactions" AS t
SET "credential_id" = c."id"
FROM "application_credentials" AS c
WHERE c."application_id" = t."application_id";--> statement-breakpoint

UPDATE "webhook_deliveries" AS w
SET "credential_id" = c."id"
FROM "application_credentials" AS c
WHERE c."application_id" = w."application_id";--> statement-breakpoint

ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_credential_id_application_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."application_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credential_id_application_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."application_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_credential_id_application_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."application_credentials"("id") ON DELETE no action ON UPDATE no action;
