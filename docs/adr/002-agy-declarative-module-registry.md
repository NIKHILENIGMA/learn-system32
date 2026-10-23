# ADR-002: Code-First `src/modules/<slug>/` Registry Authored by `agy` & Deterministic SLA/Topology Grader

- **Status:** Accepted
- **Date:** 2026-10-23

## Context
The developer's primary workflow is to learn system design topics one by one (e.g., URL Shortener, Rate Limiter, Caching Strategies). Rather than manually filling out an in-app CMS form to build new modules, the developer wants `agy` to generate new learning modules directly in the codebase (`src/modules/<slug>/`) so the developer can focus 100% on learning via the interactive canvas, getting evaluated ("right or wrong"), and reading deep-dive post-completion insights.

## Options Considered
1. **Declarative TypeScript Module Registry (`src/modules/<slug>/index.ts`) + Deterministic SLA & Topology Grader (Chosen):** Each module is a strongly-typed TypeScript folder containing concept briefs, SLA constraints, starter canvas nodes/edges, structural topology assertions, reference solution, and post-completion insights.
2. **Database-Driven In-App Module Studio CMS:** Requires building complex admin forms for editing node graphs and validation functions before any learning can happen.
3. **LLM-Only Evaluation Grader:** Sending every check to an LLM adds latency, API cost, and non-deterministic pass/fail results.

## Decision
We chose **Option 1**: `agy` authors self-contained modules inside `src/modules/<slug>/index.ts`, and `src/engine/grader` evaluates user designs deterministically using both a 10-tick load stress simulation and structural `topologyRules`, unlocking curated `postCompletionInsights` (plus optional P1 AI Mentor reviews).

## Consequences
- **Positive:** Type-safe module definitions allow custom topological rules in pure TypeScript functions; zero AI cost required to grade designs in real time; adding a new topic takes a single prompt to `agy`.
- **Trade-offs / Future Evolution:** In P2, we can add a dedicated `.agents/skills/module-author` skill so `agy` follows a strict checklist whenever generating new system design topics.
