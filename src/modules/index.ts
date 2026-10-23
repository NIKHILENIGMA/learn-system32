import type { LearningModule, ModuleTier } from "@/engine/types";

const TIER_ORDER: Readonly<Record<ModuleTier, number>> = {
  "tier-1-foundations": 1,
  "tier-2-async": 2,
  "tier-3-distributed": 3,
};

/**
 * Declarative registry of all learning modules authored in `src/modules/<slug>/`.
 * New modules added in Task 002 / Task 006 register here and are automatically
 * sorted by tier and module order.
 */
export const MODULES_REGISTRY: ReadonlyArray<LearningModule> = [];

export function getAllModules(): LearningModule[] {
  return [...MODULES_REGISTRY].sort((a, b) => {
    const tierDiff =
      TIER_ORDER[a.metadata.tier] - TIER_ORDER[b.metadata.tier];
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return a.metadata.order - b.metadata.order;
  });
}

export function getModuleBySlug(slug: string): LearningModule | undefined {
  return MODULES_REGISTRY.find((mod) => mod.metadata.slug === slug);
}
