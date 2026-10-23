CREATE TYPE "public"."module_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "assessment_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_slug" varchar(128) NOT NULL,
	"attempt_id" uuid,
	"passed" boolean NOT NULL,
	"score_percent" integer NOT NULL,
	"achieved_read_rps" integer NOT NULL,
	"achieved_write_rps" integer NOT NULL,
	"p95_latency_ms" integer NOT NULL,
	"error_rate_percent" numeric(5, 2) NOT NULL,
	"estimated_monthly_cost_usd" integer NOT NULL,
	"sla_results_json" jsonb NOT NULL,
	"topology_results_json" jsonb NOT NULL,
	"ai_mentor_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_slug" varchar(128) NOT NULL,
	"label" varchar(160) DEFAULT 'Active Draft' NOT NULL,
	"nodes_json" jsonb NOT NULL,
	"edges_json" jsonb NOT NULL,
	"schema_lab_json" jsonb,
	"is_active_draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_slug" varchar(128) NOT NULL,
	"status" "module_progress_status" DEFAULT 'not_started' NOT NULL,
	"insights_unlocked" boolean DEFAULT false NOT NULL,
	"best_score_percent" integer DEFAULT 0 NOT NULL,
	"best_p95_latency_ms" integer,
	"lowest_monthly_cost_usd" integer,
	"first_completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_runs" ADD CONSTRAINT "assessment_runs_module_slug_module_progress_module_slug_fk" FOREIGN KEY ("module_slug") REFERENCES "public"."module_progress"("module_slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_runs" ADD CONSTRAINT "assessment_runs_attempt_id_canvas_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."canvas_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_attempts" ADD CONSTRAINT "canvas_attempts_module_slug_module_progress_module_slug_fk" FOREIGN KEY ("module_slug") REFERENCES "public"."module_progress"("module_slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_runs_slug_created_idx" ON "assessment_runs" USING btree ("module_slug","created_at");--> statement-breakpoint
CREATE INDEX "canvas_attempts_slug_active_updated_idx" ON "canvas_attempts" USING btree ("module_slug","is_active_draft","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "module_progress_module_slug_unique" ON "module_progress" USING btree ("module_slug");