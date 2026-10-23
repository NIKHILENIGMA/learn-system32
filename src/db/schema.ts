import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  CanvasEdge,
  CanvasNode,
  SLACheckResult,
  TopologyCheckResult,
} from "@/engine/types";

export const moduleProgressStatusEnum = pgEnum("module_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export interface SchemaLabSnapshot {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      dataType: string;
      isPrimaryKey?: boolean;
      isNullable?: boolean;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique?: boolean;
    }>;
  }>;
}

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleSlug: varchar("module_slug", { length: 128 }).notNull(),
    status: moduleProgressStatusEnum("status")
      .notNull()
      .default("not_started"),
    insightsUnlocked: boolean("insights_unlocked").notNull().default(false),
    bestScorePercent: integer("best_score_percent").notNull().default(0),
    bestP95LatencyMs: integer("best_p95_latency_ms"),
    lowestMonthlyCostUsd: integer("lowest_monthly_cost_usd"),
    firstCompletedAt: timestamp("first_completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("module_progress_module_slug_unique").on(table.moduleSlug),
  ],
);

export const canvasAttempts = pgTable(
  "canvas_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleSlug: varchar("module_slug", { length: 128 })
      .notNull()
      .references(() => moduleProgress.moduleSlug, { onDelete: "cascade" }),
    label: varchar("label", { length: 160 }).notNull().default("Active Draft"),
    nodesJson: jsonb("nodes_json").$type<CanvasNode[]>().notNull(),
    edgesJson: jsonb("edges_json").$type<CanvasEdge[]>().notNull(),
    schemaLabJson: jsonb("schema_lab_json").$type<SchemaLabSnapshot | null>(),
    isActiveDraft: boolean("is_active_draft").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("canvas_attempts_slug_active_updated_idx").on(
      table.moduleSlug,
      table.isActiveDraft,
      table.updatedAt,
    ),
  ],
);

export const assessmentRuns = pgTable(
  "assessment_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleSlug: varchar("module_slug", { length: 128 })
      .notNull()
      .references(() => moduleProgress.moduleSlug, { onDelete: "cascade" }),
    attemptId: uuid("attempt_id").references(() => canvasAttempts.id, {
      onDelete: "set null",
    }),
    passed: boolean("passed").notNull(),
    scorePercent: integer("score_percent").notNull(),
    achievedReadRps: integer("achieved_read_rps").notNull(),
    achievedWriteRps: integer("achieved_write_rps").notNull(),
    p95LatencyMs: integer("p95_latency_ms").notNull(),
    errorRatePercent: numeric("error_rate_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    estimatedMonthlyCostUsd: integer("estimated_monthly_cost_usd").notNull(),
    slaResultsJson: jsonb("sla_results_json")
      .$type<SLACheckResult[]>()
      .notNull(),
    topologyResultsJson: jsonb("topology_results_json")
      .$type<TopologyCheckResult[]>()
      .notNull(),
    aiMentorFeedback: text("ai_mentor_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_runs_slug_created_idx").on(
      table.moduleSlug,
      table.createdAt,
    ),
  ],
);

export const moduleProgressRelations = relations(
  moduleProgress,
  ({ many }) => ({
    canvasAttempts: many(canvasAttempts),
    assessmentRuns: many(assessmentRuns),
  }),
);

export const canvasAttemptsRelations = relations(
  canvasAttempts,
  ({ one, many }) => ({
    moduleProgress: one(moduleProgress, {
      fields: [canvasAttempts.moduleSlug],
      references: [moduleProgress.moduleSlug],
    }),
    assessmentRuns: many(assessmentRuns),
  }),
);

export const assessmentRunsRelations = relations(assessmentRuns, ({ one }) => ({
  moduleProgress: one(moduleProgress, {
    fields: [assessmentRuns.moduleSlug],
    references: [moduleProgress.moduleSlug],
  }),
  canvasAttempt: one(canvasAttempts, {
    fields: [assessmentRuns.attemptId],
    references: [canvasAttempts.id],
  }),
}));

export type ModuleProgressRow = typeof moduleProgress.$inferSelect;
export type NewModuleProgressRow = typeof moduleProgress.$inferInsert;
export type CanvasAttemptRow = typeof canvasAttempts.$inferSelect;
export type NewCanvasAttemptRow = typeof canvasAttempts.$inferInsert;
export type AssessmentRunRow = typeof assessmentRuns.$inferSelect;
export type NewAssessmentRunRow = typeof assessmentRuns.$inferInsert;
