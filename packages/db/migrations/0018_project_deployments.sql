CREATE TABLE "project_deployments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_deployments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_id" bigint NOT NULL,
	"vercel_deployment_id" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"deployed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_deployments_vercel_deployment_id_unique" UNIQUE("vercel_deployment_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "vercel_project_id" text;--> statement-breakpoint
ALTER TABLE "project_deployments" ADD CONSTRAINT "project_deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_deployments_project_idx" ON "project_deployments" USING btree ("project_id","deployed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_vercel_project_unique" ON "projects" USING btree ("vercel_project_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "project_vercel_project_id" CHECK ("projects"."vercel_project_id" IS NULL OR "projects"."vercel_project_id" ~ '^prj_[A-Za-z0-9]+$');