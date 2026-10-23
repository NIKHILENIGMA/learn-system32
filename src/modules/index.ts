import type { LearningModule, ModuleTier } from "@/engine/types";
import { singleServerBottleneckModule } from "./01-single-server-bottleneck";
import { urlShortenerModule } from "./02-url-shortener";

export interface TierDisplayMeta {
  tier: ModuleTier;
  stepNumber: number;
  title: string;
  subtitle: string;
  accentColor: "emerald" | "sky" | "amber";
}

export const TIER_METADATA: Readonly<Record<ModuleTier, TierDisplayMeta>> = {
  "tier-1-foundations": {
    tier: "tier-1-foundations",
    stepNumber: 1,
    title: "Tier 1 — Foundations: Single Server to Horizontal Scale",
    subtitle:
      "Master stateless horizontal compute, L7 load balancing, M/M/1 queueing latency, and cache-aside read offloading.",
    accentColor: "emerald",
  },
  "tier-2-async": {
    tier: "tier-2-async",
    stepNumber: 2,
    title: "Tier 2 — Asynchronous & High-Write Systems",
    subtitle:
      "Decouple bursty write spikes with Kafka message queues, background workers, API gateway rate limiting, and DB sharding.",
    accentColor: "sky",
  },
  "tier-3-distributed": {
    tier: "tier-3-distributed",
    stepNumber: 3,
    title: "Tier 3 — Elite Distributed Systems & Real-World Labs",
    subtitle:
      "Architect production-scale distributed systems under extreme read/write asymmetry, edge caching, and strict failover SLAs.",
    accentColor: "amber",
  },
};

export const ORDERED_TIERS: ReadonlyArray<ModuleTier> = [
  "tier-1-foundations",
  "tier-2-async",
  "tier-3-distributed",
];

/**
 * Declarative registry of all learning modules authored in `src/modules/<slug>/`.
 * Exporting a module in `src/modules/<slug>/index.ts` and registering it here
 * automatically exposes it to `/api/modules`, `pnpm db:seed`, and the `/` Skill-Tree Dashboard.
 */
export const MODULES_REGISTRY: ReadonlyArray<LearningModule> = [
  singleServerBottleneckModule,
  urlShortenerModule,
];

export function getAllModules(): LearningModule[] {
  return [...MODULES_REGISTRY].sort((a, b) => {
    const tierDiff =
      TIER_METADATA[a.metadata.tier].stepNumber -
      TIER_METADATA[b.metadata.tier].stepNumber;
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return a.metadata.order - b.metadata.order;
  });
}

export function getModuleBySlug(slug: string): LearningModule | undefined {
  return MODULES_REGISTRY.find((mod) => mod.metadata.slug === slug);
}
