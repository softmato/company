-- A revoked credential must not hold its mode's slot forever.
--
-- `UNIQUE (application_id, mode)` counted revoked rows, so revoking an
-- application's Production credential left the slot occupied by a dead row and
-- there was no way to issue another: the panel shows a create button only for a
-- mode that does not exist, and `addCredential` refused. The only routes back
-- were a whole new application or an UPDATE by hand.
--
-- The partial index keeps the guarantee that matters -- at most one *live*
-- credential per mode -- and lets the dead rows accumulate. They have to stay:
-- `transactions.credential_id` and `webhook_deliveries.credential_id` reference
-- them, and they are the record of which key was live when.
--
-- Generated, not hand-written: from 0007 the snapshot baseline is truthful
-- again, so `drizzle-kit generate` produces correct SQL here. Note the WHERE
-- clause is emitted fully qualified, which is what makes it safe.

ALTER TABLE "application_credentials" DROP CONSTRAINT "application_credentials_mode_key";--> statement-breakpoint
CREATE UNIQUE INDEX "application_credentials_live_mode_key" ON "application_credentials" USING btree ("application_id","mode") WHERE "application_credentials"."revoked_at" IS NULL;