-- Sandbox or Production, recorded on the row instead of inferred at read time.
--
-- Three of the four entry points that touch a payment carry no credential to
-- ask: the customer's browser arrives holding a session id, the gateway's
-- callback holds a provider reference, and the retry job holds neither. The
-- mode has to be written where those three can read it.
--
-- Added nullable, backfilled, then constrained. Adding it NOT NULL outright is
-- what `drizzle-kit generate` writes, and it fails on any table that already
-- has rows; both of these do.
ALTER TABLE "payment_sessions" ADD COLUMN "mode" "credential_mode";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "mode" "credential_mode";--> statement-breakpoint

-- Every session id is `cs_<mode>_<entropy>` and has been since sessions
-- existed: 444 of 444 rows in production and 3048 of 3048 in development carry
-- the prefix. The backfill is total, not best-effort.
UPDATE "payment_sessions"
   SET "mode" = (CASE WHEN "id" LIKE 'cs_live_%' THEN 'live' ELSE 'test' END)::"credential_mode"
 WHERE "mode" IS NULL;--> statement-breakpoint

-- Transactions take the session's answer rather than re-deriving one. Every
-- transaction has a session_id (177 of 177 in production, 2055 of 2055 in
-- development), so the join reaches every row.
UPDATE "transactions" t
   SET "mode" = s."mode"
  FROM "payment_sessions" s
 WHERE t."session_id" = s."id" AND t."mode" IS NULL;--> statement-breakpoint

-- Anything the join could not reach settles as Sandbox. Nothing should land
-- here. 'test' is the safe direction: it can strand a payment for someone to
-- notice, where 'live' would quietly point a test payment at a real gateway.
UPDATE "transactions" SET "mode" = 'test'::"credential_mode" WHERE "mode" IS NULL;--> statement-breakpoint

ALTER TABLE "payment_sessions" ALTER COLUMN "mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "mode" SET NOT NULL;
