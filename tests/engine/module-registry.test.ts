import { describe, expect, it } from "vitest";
import { getAllModules, getModuleBySlug } from "@/modules";
import {
  parseModulesListQuery,
  toModuleCardSummaryDto,
  toModuleDetailDto,
} from "@/modules/dto";

describe("Module Registry & DTO Contracts (FEAT-01)", () => {
  it("discovers and sorts registered modules by tier stepNumber and module order", () => {
    const modules = getAllModules();
    expect(modules.length).toBeGreaterThanOrEqual(2);
    expect(modules[0]?.metadata.slug).toBe("01-single-server-bottleneck");
    expect(modules[0]?.metadata.tier).toBe("tier-1-foundations");
    expect(modules[1]?.metadata.slug).toBe("02-url-shortener");
    expect(modules[1]?.metadata.tier).toBe("tier-3-distributed");
  });

  it("evaluates starterGraph vs referenceSolution against module topologyRules", () => {
    const mod = getModuleBySlug("01-single-server-bottleneck");
    expect(mod).toBeDefined();
    if (!mod) return;

    // Starter graph has no Load Balancer, only 1 API instance, and no Redis Cache -> all 3 rules should fail
    const starterResults = mod.topologyRules.map((rule) =>
      rule.validate(mod.starterGraph.nodes, mod.starterGraph.edges),
    );
    expect(starterResults.every((res) => res.passed === false)).toBe(true);

    // Reference solution graph satisfies all topology rules
    const referenceResults = mod.topologyRules.map((rule) =>
      rule.validate(mod.referenceSolution.nodes, mod.referenceSolution.edges),
    );
    expect(referenceResults.every((res) => res.passed === true)).toBe(true);
  });

  it("validates query filters in parseModulesListQuery and rejects unknown values", () => {
    const validParams = new URLSearchParams(
      "tier=tier-1-foundations&status=not_started&difficulty=Beginner&search=redis",
    );
    const validResult = parseModulesListQuery(validParams);
    expect(validResult.ok).toBe(true);
    if (validResult.ok) {
      expect(validResult.value.tier).toBe("tier-1-foundations");
      expect(validResult.value.status).toBe("not_started");
      expect(validResult.value.difficulty).toBe("Beginner");
      expect(validResult.value.search).toBe("redis");
    }

    const invalidTierParams = new URLSearchParams("tier=tier-99-unknown");
    const invalidResult = parseModulesListQuery(invalidTierParams);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(invalidResult.errorCode).toBe("VALIDATION_FAILED");
    }
  });

  it("gates referenceSolution and postCompletionInsights in toModuleDetailDto unless unlocked or peek=true", () => {
    const mod = getModuleBySlug("02-url-shortener");
    expect(mod).toBeDefined();
    if (!mod) return;

    const cardDto = toModuleCardSummaryDto(mod);
    expect(cardDto.progress.status).toBe("not_started");
    expect(cardDto.topologyRuleCount).toBe(3);

    // Locked by default when progress is not_started and peekInsights is false
    const lockedDetail = toModuleDetailDto({
      mod,
      peekInsights: false,
      dbConnected: false,
    });
    expect(lockedDetail.referenceSolution).toBeNull();
    expect(lockedDetail.postCompletionInsights).toBeNull();

    // Unlocked when peekInsights is true
    const peekDetail = toModuleDetailDto({
      mod,
      peekInsights: true,
      dbConnected: false,
    });
    expect(peekDetail.referenceSolution).not.toBeNull();
    expect(peekDetail.postCompletionInsights).not.toBeNull();
  });
});
