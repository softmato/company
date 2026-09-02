CREATE TABLE "application_domains" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "application_domains_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1) NOT NULL,
	"application_id" bigint NOT NULL,
	"hostname" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "application_domains_pkey" PRIMARY KEY("id"),
	CONSTRAINT "hostname_is_bare_lowercase" CHECK ("application_domains"."hostname" = lower("application_domains"."hostname")
          AND "application_domains"."hostname" !~ '[/:*[:space:]]'
          AND "application_domains"."hostname" ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
          AND "application_domains"."hostname" !~ '\.[0-9]+$'
          AND length("application_domains"."hostname") BETWEEN 4 AND 253)
);
--> statement-breakpoint
ALTER TABLE "application_domains" ADD CONSTRAINT "application_domains_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_domains_unique" ON "application_domains" USING btree ("application_id","hostname");--> statement-breakpoint
CREATE INDEX "application_domains_application_idx" ON "application_domains" USING btree ("application_id");
