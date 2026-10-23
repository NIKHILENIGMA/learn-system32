import { db, moduleProgress, pool } from "./index";
import { getAllModules } from "@/modules";

export async function seedModuleProgress(): Promise<{
  discoveredCount: number;
  seededSlugs: string[];
}> {
  const modules = getAllModules();

  if (modules.length === 0) {
    console.info(
      "[db:seed] 0 modules registered in src/modules/index.ts yet (skipping row insert).",
    );
    return { discoveredCount: 0, seededSlugs: [] };
  }

  const values = modules.map((mod) => ({
    moduleSlug: mod.metadata.slug,
    status: "not_started" as const,
    insightsUnlocked: false,
    bestScorePercent: 0,
  }));

  await db
    .insert(moduleProgress)
    .values(values)
    .onConflictDoNothing({ target: moduleProgress.moduleSlug });

  const seededSlugs = modules.map((mod) => mod.metadata.slug);
  console.info(
    `[db:seed] Synced ${seededSlugs.length} module_progress record(s): ${seededSlugs.join(", ")}`,
  );

  return {
    discoveredCount: modules.length,
    seededSlugs,
  };
}

async function runCliSeed(): Promise<void> {
  try {
    await seedModuleProgress();
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runCliSeed().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown seed error";
    console.error(`[db:seed] Failed to seed database: ${message}`);
    process.exit(1);
  });
}
