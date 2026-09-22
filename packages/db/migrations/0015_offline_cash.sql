ALTER TABLE "applications" DROP CONSTRAINT "scopes_known";--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "scopes_known" CHECK ("applications"."scopes" <@ ARRAY['payment:create','payment:read','invoice:create','invoice:read','refund:request','customer:read','offline_payment:record']::TEXT[]);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "cash_needs_second_person" CHECK ("transactions"."provider_id" <> 'cash' OR "transactions"."status" NOT IN ('succeeded','refunded','partially_refunded') OR "transactions"."approved_by" IS NOT NULL);--> statement-breakpoint
-- Cash is a payment method, not a gateway: no adapter, never offered at
-- checkout (inactive), booked to Cash in Hand on an admin's confirmation.
-- Only where the chart of accounts exists: a fresh database gets its accounts,
-- and this row, from the seed (seed/providers.ts), which runs after migrations.
INSERT INTO "payment_providers"
  ("id", "display_name", "is_active", "balance_account", "fee_account",
   "supports_refund", "supports_callback", "requires_polling", "sort_order")
SELECT 'cash', 'Cash', FALSE, '1010', '5010', FALSE, FALSE, FALSE, 90
 WHERE EXISTS (SELECT 1 FROM "accounts" WHERE "code" = '1010')
   AND EXISTS (SELECT 1 FROM "accounts" WHERE "code" = '5010')
ON CONFLICT ("id") DO NOTHING;
