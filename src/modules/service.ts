import { and, desc, eq } from "drizzle-orm";
import {
  assessmentRuns,
  canvasAttempts,
  db,
  moduleProgress,
  type AssessmentRunRow,
  type CanvasAttemptRow,
  type ModuleProgressRow,
} from "@/db";
import { getAllModules, getModuleBySlug } from "./index";
import {
  toModuleCardSummaryDto,
  toModuleDetailDto,
  type ModuleCardSummaryDto,
  type ModuleDetailDto,
  type ModuleListMetaDto,
  type ModulesListFilterQuery,
} from "./dto";

export interface ModulesListServiceResult {
  items: ModuleCardSummaryDto[];
  meta: ModuleListMetaDto;
}

async function fetchAllProgressRowsSafely(): Promise<{
  progressBySlug: Map<string, ModuleProgressRow>;
  dbConnected: boolean;
}> {
  try {
    const rows = await db.select().from(moduleProgress);
    const progressBySlug = new Map<string, ModuleProgressRow>();
    for (const row of rows) {
      progressBySlug.set(row.moduleSlug, row);
    }
    return { progressBySlug, dbConnected: true };
  } catch {
    return {
      progressBySlug: new Map<string, ModuleProgressRow>(),
      dbConnected: false,
    };
  }
}

function matchesSearchFilter(
  card: ModuleCardSummaryDto,
  rawQuery?: string,
): boolean {
  if (!rawQuery) {
    return true;
  }
  const needle = rawQuery.toLowerCase();
  const inTitle = card.metadata.title.toLowerCase().includes(needle);
  const inSubtitle = card.metadata.subtitle.toLowerCase().includes(needle);
  const inSlug = card.metadata.slug.toLowerCase().includes(needle);
  const inTags = card.metadata.tags.some((tag) =>
    tag.toLowerCase().includes(needle),
  );
  return inTitle || inSubtitle || inSlug || inTags;
}

/**
 * Returns all discovered learning modules merged with PostgreSQL `module_progress`,
 * computing platform summary stats and applying optional tier/status/difficulty/search filters.
 */
export async function listModulesWithProgress(
  filters: ModulesListFilterQuery = {},
): Promise<ModulesListServiceResult> {
  const allModules = getAllModules();
  const { progressBySlug, dbConnected } = await fetchAllProgressRowsSafely();

  const allCards = allModules.map((mod) =>
    toModuleCardSummaryDto(mod, progressBySlug.get(mod.metadata.slug)),
  );

  const completedCount = allCards.filter(
    (card) => card.progress.status === "completed",
  ).length;
  const inProgressCount = allCards.filter(
    (card) => card.progress.status === "in_progress",
  ).length;
  const notStartedCount = allCards.filter(
    (card) => card.progress.status === "not_started",
  ).length;

  const scoredCards = allCards.filter(
    (card) => card.progress.bestScorePercent > 0,
  );
  const averageBestScore =
    scoredCards.length > 0
      ? Math.round(
          scoredCards.reduce(
            (sum, card) => sum + card.progress.bestScorePercent,
            0,
          ) / scoredCards.length,
        )
      : 0;

  const filteredItems = allCards.filter((card) => {
    if (filters.tier && card.metadata.tier !== filters.tier) {
      return false;
    }
    if (filters.status && card.progress.status !== filters.status) {
      return false;
    }
    if (filters.difficulty && card.metadata.difficulty !== filters.difficulty) {
      return false;
    }
    if (!matchesSearchFilter(card, filters.search)) {
      return false;
    }
    return true;
  });

  return {
    items: filteredItems,
    meta: {
      totalModules: allCards.length,
      filteredCount: filteredItems.length,
      completedCount,
      inProgressCount,
      notStartedCount,
      averageBestScore,
      dbConnected,
    },
  };
}

/**
 * Loads a single module definition by `slug` merged with its PostgreSQL `module_progress`,
 * active draft canvas from `canvas_attempts`, and up to 5 recent `assessment_runs`.
 */
export async function getModuleDetailBySlug(
  slug: string,
  options: { peekInsights?: boolean } = {},
): Promise<ModuleDetailDto | null> {
  const mod = getModuleBySlug(slug);
  if (!mod) {
    return null;
  }

  let progressRow: ModuleProgressRow | undefined;
  let activeDraftRow: CanvasAttemptRow | undefined;
  let recentRunRows: AssessmentRunRow[] = [];
  let dbConnected = true;

  try {
    const [progressRows, draftRows, runRows] = await Promise.all([
      db
        .select()
        .from(moduleProgress)
        .where(eq(moduleProgress.moduleSlug, slug))
        .limit(1),
      db
        .select()
        .from(canvasAttempts)
        .where(
          and(
            eq(canvasAttempts.moduleSlug, slug),
            eq(canvasAttempts.isActiveDraft, true),
          ),
        )
        .orderBy(desc(canvasAttempts.updatedAt))
        .limit(1),
      db
        .select()
        .from(assessmentRuns)
        .where(eq(assessmentRuns.moduleSlug, slug))
        .orderBy(desc(assessmentRuns.createdAt))
        .limit(5),
    ]);

    progressRow = progressRows[0];
    activeDraftRow = draftRows[0];
    recentRunRows = runRows;
  } catch {
    dbConnected = false;
  }

  return toModuleDetailDto({
    mod,
    progressRow,
    activeDraftRow,
    recentRunRows,
    peekInsights: options.peekInsights,
    dbConnected,
  });
}
