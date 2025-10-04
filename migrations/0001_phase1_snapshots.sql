CREATE TABLE "market_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticker" varchar(20) NOT NULL,
  "provider" varchar(50) NOT NULL,
  "captured_at" timestamp DEFAULT now() NOT NULL,
  "raw_payload" jsonb NOT NULL,
  "normalized_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "market_snapshots_ticker_idx" ON "market_snapshots" USING btree ("ticker");
--> statement-breakpoint
CREATE INDEX "market_snapshots_provider_idx" ON "market_snapshots" USING btree ("provider");
--> statement-breakpoint
CREATE INDEX "market_snapshots_captured_at_idx" ON "market_snapshots" USING btree ("captured_at");
--> statement-breakpoint

CREATE TABLE "financial_statements" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticker" varchar(20) NOT NULL,
  "statement_type" varchar(30) NOT NULL,
  "fiscal_year" integer,
  "fiscal_quarter" integer,
  "period_start" date,
  "period_end" date,
  "currency" varchar(10) DEFAULT 'USD',
  "data" jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "financial_statements_ticker_idx" ON "financial_statements" USING btree ("ticker");
--> statement-breakpoint
CREATE INDEX "financial_statements_type_idx" ON "financial_statements" USING btree ("statement_type");
--> statement-breakpoint
CREATE INDEX "financial_statements_period_idx" ON "financial_statements" USING btree ("fiscal_year", "fiscal_quarter");
--> statement-breakpoint

CREATE TABLE "workspace_data_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "workflow_id" integer NOT NULL,
  "snapshot_type" varchar(50) NOT NULL,
  "market_snapshot_id" integer,
  "financial_statement_id" integer,
  "artifact_id" integer,
  "data" jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_data_snapshots" ADD CONSTRAINT "workspace_data_snapshots_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_data_snapshots" ADD CONSTRAINT "workspace_data_snapshots_market_snapshot_id_market_snapshots_id_fk" FOREIGN KEY ("market_snapshot_id") REFERENCES "public"."market_snapshots"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_data_snapshots" ADD CONSTRAINT "workspace_data_snapshots_financial_statement_id_financial_statements_id_fk" FOREIGN KEY ("financial_statement_id") REFERENCES "public"."financial_statements"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_data_snapshots" ADD CONSTRAINT "workspace_data_snapshots_artifact_id_workflow_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."workflow_artifacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workspace_data_snapshots_workflow_id_idx" ON "workspace_data_snapshots" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX "workspace_data_snapshots_type_idx" ON "workspace_data_snapshots" USING btree ("snapshot_type");
--> statement-breakpoint

CREATE TABLE "ai_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "workflow_id" integer NOT NULL,
  "user_id" integer,
  "provider" varchar(50) DEFAULT 'openai' NOT NULL,
  "capability" varchar(50),
  "prompt" jsonb NOT NULL,
  "response" jsonb NOT NULL,
  "verification" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_workflow_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."workflow_users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ai_audit_logs_workflow_id_idx" ON "ai_audit_logs" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX "ai_audit_logs_user_id_idx" ON "ai_audit_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "ai_audit_logs_provider_idx" ON "ai_audit_logs" USING btree ("provider");
