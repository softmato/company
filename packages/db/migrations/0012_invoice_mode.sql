-- The same mark the payment rows carry, on the document the payment settles.
--
-- A dashboard that separated payments but not invoices would report money owed
-- for one population and money taken for another, which is worse than not
-- separating either.
--
-- Nullable, backfilled, then constrained -- `drizzle-kit generate` writes ADD
-- COLUMN NOT NULL, which fails on a table that already has rows.
ALTER TABLE "invoices" ADD COLUMN "mode" "credential_mode";--> statement-breakpoint

-- Almost every invoice can be asked rather than guessed at: 92 of 93 rows in
-- production and 1718 of 1719 in development have a payment session, and those
-- sessions now record their own mode. An invoice with more than one session
-- takes the earliest, which is the one that opened the activity.
UPDATE "invoices" i
   SET "mode" = s."mode"
  FROM (
    SELECT DISTINCT ON (invoice_id) invoice_id, "mode"
      FROM "payment_sessions"
     ORDER BY invoice_id, created_at ASC
  ) s
 WHERE s."invoice_id" = i."id" AND i."mode" IS NULL;--> statement-breakpoint

-- The remainder has never had a session, so nothing recorded what it was for.
-- 'test' rather than 'live': every invoice in either database today predates
-- this column and belongs to development traffic, and marking real revenue as
-- Sandbox understates a dashboard where marking development traffic as
-- Production would invent revenue that was never earned.
UPDATE "invoices" SET "mode" = 'test'::"credential_mode" WHERE "mode" IS NULL;--> statement-breakpoint

ALTER TABLE "invoices" ALTER COLUMN "mode" SET NOT NULL;
