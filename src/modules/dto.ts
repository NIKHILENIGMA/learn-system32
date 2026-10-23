import type {
  AssessmentRunRow,
  CanvasAttemptRow,
  ModuleProgressRow,
  SchemaLabSnapshot,
} from "@/db/schema";
import type {
  CanvasEdge,
  CanvasNode,
  ConceptBrief,
  LearningModule,
  LevelSLAConstraints,
  ModuleDifficulty,
  ModuleMetadata,
  ModuleRequirements,
  ModuleTier,
  NodeCategory,
  PostCompletionInsights,
  ReferenceSolution,
  SLACheckResult,
  StarterGraph,
  TopologyCheckResult,
} from "@/engine/types";

export const VALID_MODULE_TIERS: ReadonlyArray<ModuleTier> = [
  "tier-1-foundations",
  "tier-2-async",
  "tier-3-distributed",
];

export const VALID_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type ModuleProgressStatus = (typeof VALID_PROGRESS_STATUSES)[number];

export const VALID_MODULE_DIFFICULTIES: ReadonlyArray<ModuleDifficulty> = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export interface ModulesListFilterQuery {
  tier?: ModuleTier;
  status?: ModuleProgressStatus;
  difficulty?: ModuleDifficulty;
  search?: string;
}

export type QueryParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errorCode: "VALIDATION_FAILED"; message: string };

export interface ModuleProgressSummaryDto {
  status: ModuleProgressStatus;
  insightsUnlocked: boolean;
  bestScorePercent: number;
  bestP95LatencyMs: number | null;
  lowestMonthlyCostUsd: number | null;
  firstCompletedAt: string | null;
  updatedAt: string | null;
}

export interface ModuleCardSummaryDto {
  metadata: ModuleMetadata;
  problemStatement: string;
  backOfEnvelope: ConceptBrief["backOfEnvelope"];
  sla: LevelSLAConstraints;
  allowedNodeTypes?: NodeCategory[];
  topologyRuleCount: number;
  progress: ModuleProgressSummaryDto;
}

export interface ModuleListMetaDto {
  totalModules: number;
  filteredCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  averageBestScore: number;
  dbConnected: boolean;
}

export interface ActiveCanvasDraftDto {
  id: string;
  label: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  schemaLab: SchemaLabSnapshot | null;
  updatedAt: string;
}

export interface AssessmentRunSummaryDto {
  id: string;
  passed: boolean;
  scorePercent: number;
  achievedReadRps: number;
  achievedWriteRps: number;
  p95LatencyMs: number;
  errorRatePercent: number;
  estimatedMonthlyCostUsd: number;
  slaResults: SLACheckResult[];
  topologyResults: TopologyCheckResult[];
  aiMentorFeedback: string | null;
  createdAt: string;
}

export interface TopologyRuleDescriptorDto {
  id: string;
  description: string;
}

export interface ModuleDetailDto {
  metadata: ModuleMetadata;
  conceptBrief: ConceptBrief;
  requirements: ModuleRequirements;
  starterGraph: StarterGraph;
  topologyRules: TopologyRuleDescriptorDto[];
  progress: ModuleProgressSummaryDto;
  activeDraft: ActiveCanvasDraftDto | null;
  recentRuns: AssessmentRunSummaryDto[];
  referenceSolution: ReferenceSolution | null;
  postCompletionInsights: PostCompletionInsights | null;
  dbConnected: boolean;
}

export interface ApiSuccessResponse<TData, TMeta = undefined> {
  success: true;
  data: TData;
  meta?: TMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: "VALIDATION_FAILED" | "MODULE_NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
  };
  timestamp: string;
}

function isModuleTier(value: string): value is ModuleTier {
  return (VALID_MODULE_TIERS as ReadonlyArray<string>).includes(value);
}

function isModuleProgressStatus(value: string): value is ModuleProgressStatus {
  return (VALID_PROGRESS_STATUSES as ReadonlyArray<string>).includes(value);
}

function isModuleDifficulty(value: string): value is ModuleDifficulty {
  return (VALID_MODULE_DIFFICULTIES as ReadonlyArray<string>).includes(value);
}

/**
 * Validates and normalizes query parameters for `GET /api/modules`.
 */
export function parseModulesListQuery(
  searchParams: URLSearchParams,
): QueryParseResult<ModulesListFilterQuery> {
  const rawTier = searchParams.get("tier")?.trim();
  const rawStatus = searchParams.get("status")?.trim();
  const rawDifficulty = searchParams.get("difficulty")?.trim();
  const rawSearch = searchParams.get("search")?.trim();

  const filters: ModulesListFilterQuery = {};

  if (rawTier) {
    if (!isModuleTier(rawTier)) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        message: `Invalid 'tier' filter '${rawTier}'. Expected one of: ${VALID_MODULE_TIERS.join(", ")}.`,
      };
    }
    filters.tier = rawTier;
  }

  if (rawStatus) {
    if (!isModuleProgressStatus(rawStatus)) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        message: `Invalid 'status' filter '${rawStatus}'. Expected one of: ${VALID_PROGRESS_STATUSES.join(", ")}.`,
      };
    }
    filters.status = rawStatus;
  }

  if (rawDifficulty) {
    if (!isModuleDifficulty(rawDifficulty)) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        message: `Invalid 'difficulty' filter '${rawDifficulty}'. Expected one of: ${VALID_MODULE_DIFFICULTIES.join(", ")}.`,
      };
    }
    filters.difficulty = rawDifficulty;
  }

  if (rawSearch && rawSearch.length > 0) {
    filters.search = rawSearch;
  }

  return { ok: true, value: filters };
}

export function createDefaultProgressSummary(): ModuleProgressSummaryDto {
  return {
    status: "not_started",
    insightsUnlocked: false,
    bestScorePercent: 0,
    bestP95LatencyMs: null,
    lowestMonthlyCostUsd: null,
    firstCompletedAt: null,
    updatedAt: null,
  };
}

export function toModuleProgressSummaryDto(
  row?: ModuleProgressRow,
): ModuleProgressSummaryDto {
  if (!row) {
    return createDefaultProgressSummary();
  }
  return {
    status: row.status,
    insightsUnlocked: row.insightsUnlocked,
    bestScorePercent: row.bestScorePercent,
    bestP95LatencyMs: row.bestP95LatencyMs ?? null,
    lowestMonthlyCostUsd: row.lowestMonthlyCostUsd ?? null,
    firstCompletedAt: row.firstCompletedAt
      ? row.firstCompletedAt.toISOString()
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toModuleCardSummaryDto(
  mod: LearningModule,
  progressRow?: ModuleProgressRow,
): ModuleCardSummaryDto {
  return {
    metadata: mod.metadata,
    problemStatement: mod.conceptBrief.problemStatement,
    backOfEnvelope: mod.conceptBrief.backOfEnvelope,
    sla: mod.requirements.sla,
    allowedNodeTypes: mod.starterGraph.allowedNodeTypes,
    topologyRuleCount: mod.topologyRules.length,
    progress: toModuleProgressSummaryDto(progressRow),
  };
}

export function toActiveCanvasDraftDto(
  row?: CanvasAttemptRow,
): ActiveCanvasDraftDto | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    label: row.label,
    nodes: row.nodesJson,
    edges: row.edgesJson,
    schemaLab: row.schemaLabJson ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAssessmentRunSummaryDto(
  row: AssessmentRunRow,
): AssessmentRunSummaryDto {
  return {
    id: row.id,
    passed: row.passed,
    scorePercent: row.scorePercent,
    achievedReadRps: row.achievedReadRps,
    achievedWriteRps: row.achievedWriteRps,
    p95LatencyMs: row.p95LatencyMs,
    errorRatePercent: Number(row.errorRatePercent),
    estimatedMonthlyCostUsd: row.estimatedMonthlyCostUsd,
    slaResults: row.slaResultsJson,
    topologyResults: row.topologyResultsJson,
    aiMentorFeedback: row.aiMentorFeedback ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toModuleDetailDto(params: {
  mod: LearningModule;
  progressRow?: ModuleProgressRow;
  activeDraftRow?: CanvasAttemptRow;
  recentRunRows?: AssessmentRunRow[];
  peekInsights?: boolean;
  dbConnected: boolean;
}): ModuleDetailDto {
  const progress = toModuleProgressSummaryDto(params.progressRow);
  const canViewInsights =
    progress.insightsUnlocked || Boolean(params.peekInsights);

  return {
    metadata: params.mod.metadata,
    conceptBrief: params.mod.conceptBrief,
    requirements: params.mod.requirements,
    starterGraph: params.mod.starterGraph,
    topologyRules: params.mod.topologyRules.map((rule) => ({
      id: rule.id,
      description: rule.description,
    })),
    progress,
    activeDraft: toActiveCanvasDraftDto(params.activeDraftRow),
    recentRuns: (params.recentRunRows ?? []).map(toAssessmentRunSummaryDto),
    referenceSolution: canViewInsights ? params.mod.referenceSolution : null,
    postCompletionInsights: canViewInsights
      ? params.mod.postCompletionInsights
      : null,
    dbConnected: params.dbConnected,
  };
}
