ALTER TABLE "projects" ADD COLUMN "preview_slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_preview_slug_unique" ON "projects" USING btree ("preview_slug");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "project_preview_slug_label" CHECK ("projects"."preview_slug" IS NULL OR "projects"."preview_slug" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');