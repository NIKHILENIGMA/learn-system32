# Task & Microtask Specification Templates (`docs/tasks/`)

Use these templates when managing the master index (`docs/tasks/README.md`) and generating an individual task/feature file (`docs/tasks/00X-<slug>.md`).

---

## 1. `docs/tasks/README.md` Template (Master Task Index)
*(Create this file if it does not already exist; otherwise update its table rows without deleting completed tasks.)*

```markdown
# Project Task & Feature Index (`docs/tasks/`)

> **How This Directory Works:**
> - This `README.md` is the master index tracking every phase and feature—where it started, where it ended, and what is next.
> - Each numbered file (`001-*.md`, `002-*.md`, ...) holds the atomic **1–3 file microtask breakdown** for that feature.
> - **Never edit 10–12 files at once:** Open only the active `00X-<slug>.md` file and execute one microtask (`TASK-01`, `TASK-02`...) at a time.

## Master Execution Index

| Task # | Task File | Feature ID | Phase | Priority | Status | Started | Completed | Summary |
|---|---|---|---|---|---|---|---|---|
| `001` | [001-foundation-and-setup.md](./001-foundation-and-setup.md) | `CORE` | Phase 1: Foundation | **P0** | `Completed` | YYYY-MM-DD | YYYY-MM-DD | Repo setup, DB/State wiring & Seed data |
| `002` | [002-<feat-slug>.md](./002-<feat-slug>.md) | `FEAT-01` | Phase 2: MVP Core | **P0** | `In Progress` | YYYY-MM-DD | — | <Feature summary> |
| `003` | [003-<next-feat-slug>.md](./003-<next-feat-slug>.md) | `FEAT-02` | Phase 2: MVP Core | **P0** | `Planned` | — | — | <Feature summary> |
```

---

## 2. `docs/tasks/00X-<slug>.md` Template (Individual Feature & Microtask File)
*(Omit backend sections for Frontend-Only projects, and omit UI sections for Backend-Only projects.)*

```markdown
# Task `00X`: <Feature Name> (`FEAT-XX`)

- **Feature ID:** `FEAT-XX`
- **Phase / Priority:** `<Phase 2: MVP Core / P0>`
- **Status:** `In Progress` *(Update to `Completed` when all microtasks are `[x]`)*
- **Started:** `YYYY-MM-DD`
- **Completed:** `—`

---

## 1. Where This Feature Starts (Baseline & Scope)
- **Goal:** <1–2 sentence summary of what this feature builds>
- **Starting Point / Dependencies:** <Which existing tables, modules, or routes this builds upon (e.g., "Builds on `users` table from Task `001`")>
- **Access & Permissions:** <Public / Authenticated User / Specific Role>
- **Business Rules & Edge Cases:**
  - <Rule 1: e.g., Calculate totals server-side in minor units (paise/cents)>
  - <Edge Case 1: e.g., Duplicate request within 60s returns idempotent result>
  - <Edge Case 2: e.g., Resource not found -> 404 RESOURCE_NOT_FOUND>

---

## 2. Data Model / State Changes *(Omit if no DB or store changes)*
| Table / Store | Column / Field | Type & Constraints | Index / Relation / Cascade |
|---|---|---|---|
| `<orders>` | `<status>` | `enum('pending','paid','failed') NOT NULL DEFAULT 'pending'` | `INDEX(user_id, status)` |

---

## 3. Detailed API Endpoint Contracts *(Include for Backend & Full-Stack)*

### 3.1 `POST /api/v1/<resource>`
- **Auth:** `<Protected (Bearer Token) / Public>`
- **Query Params (Optional):** `<None or ?dryRun=true>`
- **Request Body Example:**
```json
{
  "name": "Acme Workspace",
  "plan": "pro"
}
```
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Workspace created successfully",
  "data": {
    "id": "wsp_01HXYZ",
    "name": "Acme Workspace",
    "plan": "pro",
    "createdAt": "2026-10-23T10:00:00.000Z"
  },
  "timestamp": "2026-10-23T10:00:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request` (`VALIDATION_FAILED`): Invalid/missing fields
  - `409 Conflict` (`RESOURCE_ALREADY_EXISTS`): Duplicate slug

---

## 4. UI Screens, Components & Edge States *(Include for Frontend & Full-Stack)*

| Screen / Component | Route / Location | State / Hook Used | Loading State | Empty State | Error State |
|---|---|---|---|---|---|
| `<WorkspaceList>` | `/dashboard` | `useWorkspacesQuery()` | 3 shimmer card skeletons | Illustration + "Create Workspace" CTA | Inline retry alert banner |
| `<CreateWorkspaceModal>` | `/dashboard` (Dialog) | `useCreateWorkspaceMutation()` | Submit button spinner + inputs disabled | — | Field Zod errors + toast on 409/500 |

---

## 5. Sequential Microtask Plan (Strict 1–3 File Cap per Microtask)

> **Agent Execution Rules:**
> 1. Execute **only ONE microtask at a time**.
> 2. Never edit files outside the **Target Files (Max 1–3)** listed for the active microtask.
> 3. Run the **Verification Check** after each microtask and mark `- [x]` before starting the next microtask.

### `TASK-01`: Database Schema & Migration *(or Frontend Types/Store)*
- [ ] **Completed**
- **Target Files (1–2 files):**
  - `<src/db/schema/workspaces.ts>`
  - `<src/db/schema/index.ts>`
- **What to Implement:** Define table columns, enums, foreign keys, and indexes matching Section 2.
- **Verification Check:** Run `<pnpm tsc --noEmit / migration generate>` with 0 errors.

### `TASK-02`: Input Validation & Output DTO Contracts
- [ ] **Completed**
- **Chained Skill:** `api-contract`
- **Target Files (1–2 files):**
  - `<src/modules/workspaces/dto/workspace.dto.ts>`
- **What to Implement:** Strict input validation schemas (`params`, `query`, `body`) and explicit Output DTO mapper.
- **Verification Check:** Run `<typecheck command>` and confirm DTO types compile cleanly.

### `TASK-03`: Domain Service & Business Logic
- [ ] **Completed**
- **Chained Skill:** `nestjs-core` *(if NestJS)*
- **Target Files (1–2 files):**
  - `<src/modules/workspaces/workspaces.service.ts>`
- **What to Implement:** Implement service methods with `async/await`, DB transactions, and domain error handling.
- **Verification Check:** Run `<typecheck / unit test command>` with 0 errors.

### `TASK-04`: Controller / Route Handler & Module Wiring
- [ ] **Completed**
- **Chained Skill:** `api-contract` + `nestjs-core` / `nextjs-core`
- **Target Files (1–2 files):**
  - `<src/modules/workspaces/workspaces.controller.ts>`
  - `<src/modules/workspaces/workspaces.module.ts>`
- **What to Implement:** Wire thin endpoints, attach auth/validation guards, and return uniform response envelope.
- **Verification Check:** Run `<build / typecheck command>` and verify route registration.

### `TASK-05`: Frontend API Client & Query/Mutation Hooks *(If UI in Scope)*
- [ ] **Completed**
- **Chained Skill:** `nextjs-core` *(if Next.js)*
- **Target Files (1–2 files):**
  - `<src/features/workspaces/queries/use-workspaces.ts>`
- **What to Implement:** Typed API calls and `TanStack Query` / `SWR` hooks with cache invalidation on mutation.
- **Verification Check:** Run `<frontend typecheck command>` with 0 errors.

### `TASK-06`: UI Components, Form & Loading/Empty/Error States *(If UI in Scope)*
- [ ] **Completed**
- **Target Files (1–3 files):**
  - `<src/features/workspaces/components/workspace-list.tsx>`
  - `<src/features/workspaces/components/create-workspace-modal.tsx>`
  - `<src/app/(dashboard)/dashboard/page.tsx>`
- **What to Implement:** Build components matching Section 4 (loading skeletons, empty CTA, error states) and mount into the route.
- **Verification Check:** Run `<frontend build / lint / typecheck command>` with 0 errors.

### `TASK-07`: Seed Data, Verification & Completion Sync
- [ ] **Completed**
- **Target Files (1–3 files):**
  - `<src/db/seed.ts or test file>`
  - `docs/tasks/00X-<slug>.md`
  - `docs/tasks/README.md`
- **What to Implement:** Add seed/test coverage, fill out **Section 6** below, and mark this task `Completed` in `docs/tasks/README.md` (and `Built` in `docs/PRD.md`).
- **Verification Check:** Run `<test + build command>` and confirm all checks pass.

---

## 6. Where We Ended & Future Extension Notes *(Filled Upon Completion)*
- **Files Created / Modified:**
  - `<List exact files built during this task>`
- **Where This Feature Ended:**
  - `<Summary of what is live and verified right now>`
- **How to Extend in the Future (Next Iterations):**
  - `<Pointer for future tasks: e.g., "To add team member invites in Task 005, extend workspaces.service.ts and add workspace_members table">`
```
