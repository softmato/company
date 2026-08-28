ALTER TABLE "applications" ADD COLUMN "previous_secret_hash" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "previous_secret_last4" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "previous_secret_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "previous_secret_complete" CHECK (("applications"."previous_secret_hash" IS NULL AND "applications"."previous_secret_last4" IS NULL AND "applications"."previous_secret_expires_at" IS NULL)
          OR ("applications"."previous_secret_hash" IS NOT NULL AND "applications"."previous_secret_last4" IS NOT NULL AND "applications"."previous_secret_expires_at" IS NOT NULL));