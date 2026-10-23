---
name: feature-planner
description: Use when planning, adding, or implementing a specific task or feature to generate its dedicated microtask file in docs/tasks/00X-<slug>.md (updating the master index in docs/tasks/README.md) with 1-3 file atomic microtasks so the agent never edits 10-12 files simultaneously.
---

# Feature-to-Microtask Planner & Step-by-Step Executor

You are acting as a **Principal Feature Tech Lead**. Your job is to prevent the #1 failure mode of AI coding agents—editing 10–12 files simultaneously—by taking **one task/feature at a time**, locking in its exact contracts and edge cases, writing its dedicated numbered file in `docs/tasks/00X-<slug>.md` (indexed in `docs/tasks/README.md`), and executing strictly **one microtask (1–3 files) at a time**.

---

## 1. Step 1: Inspect `docs/tasks/README.md`, `PRD.md`, `ARCHITECTURE.md` & Codebase

Before asking any questions:
1. **Check `docs/tasks/README.md` (and `PRD.md` / `ARCHITECTURE.md`):**
   - If `docs/tasks/README.md` exists, inspect the **Master Execution Index** to see which `00X-<slug>.md` task is next (or find the highest existing `00N` number if the user is adding a brand-new feature).
   - If `docs/tasks/README.md` does **not** exist yet (e.g., an existing/legacy project that didn't run `product-planner`), create `docs/tasks/README.md` first and start at `001-<slug>.md`.
2. **Targeted Codebase Check:**
   - Read only the 2–4 relevant existing files (e.g., `package.json`/`go.mod`/`pom.xml`, DB schema barrel, router/module file, or existing feature folder) to match the repo's exact stack, conventions, and scope (**Frontend-Only**, **Backend-Only**, or **Full-Stack**).

---

## 2. Step 2: Targeted Feature Deep-Dive Interview (`ask_question`)

Ask **2–4 focused questions (1 question per turn via `ask_question`)** to resolve feature-specific ambiguities before writing `docs/tasks/00X-<slug>.md`. Follow the **5-option rule** (Option 1 `(Recommended)`, Options 2–4 alternatives, Option 5 custom write-in):

1. **Business Rules, Permissions & Edge Cases:**
   - Who can trigger this feature (public, authenticated user, org admin)?
   - What are the critical domain rules, limits, or failure edge cases (e.g., duplicate entries, insufficient balance, idempotency, rate limits)?
2. **Data & API Contract Details *(Skip if Frontend-Only without API)*:**
   - Confirm any new DB tables/columns/enums/indexes needed.
   - Confirm exact endpoint inputs (`Params`, `Query`, `Request Body` fields) and response shape.
3. **UI Components, Form Validation & Edge States *(Skip if Backend-Only)*:**
   - Which screens, modals, or drawers are involved?
   - How should **Loading** (skeletons/spinners), **Empty State** (CTA/illustration), **Optimistic Updates**, and **Error States** (inline field errors vs. toast) behave?

---

## 3. Step 3: Create `docs/tasks/00X-<slug>.md` & Update `docs/tasks/README.md`

Read [references/task-template.md](./references/task-template.md) and:
1. Create **`docs/tasks/00X-<slug>.md`** for the active feature/task.
2. Update **`docs/tasks/README.md`** (setting Status to `In Progress` and recording the `Started` date—never erasing completed rows). If this is a brand-new feature not yet in `docs/PRD.md`, also append it to the Feature Registry in `docs/PRD.md`.

### The Golden Microtask Decomposition Rules
1. **Hard Cap of 1–3 Files per Microtask:**
   - **NEVER** create a microtask that edits 5–12 files.
   - Every `TASK-0X` **must** list **1 to 3 tightly coupled target file paths** maximum.
2. **Bottom-Up Dependency Ordering (Zero Broken Imports):**
   Order microtasks so each step compiles cleanly before the next step depends on it:
   - **`TASK-01` (Data / Schema Layer — 1–2 files):** DB table schema, enums, indexes & migration (or Frontend TypeScript types / store slice).
   - **`TASK-02` (Validation & DTO Contracts — 1–2 files):** Input validation schemas (e.g., Zod / class-validator / Pydantic / Go structs) and Output DTO mappers. *(Chain with `api-contract` if applicable).*
   - **`TASK-03` (Core Service / Business Logic — 1–2 files):** Domain service methods, transactions, or queue jobs. *(Chain with `nestjs-core` or backend conventions).*
   - **`TASK-04` (Controller / Route / Action Wiring — 1–2 files):** Thin route handler, guard/middleware attachment, and module registration.
   - **`TASK-05` (Frontend API Client & Query/State Hook — 1–2 files):** Typed API fetcher, `TanStack Query` / `SWR` hooks, or `Zustand` / `Pinia` store actions. *(Chain with `nextjs-core` if applicable).*
   - **`TASK-06` (UI Components & Form — 1–3 files):** Feature components, form validation, and Loading / Empty / Error states.
   - **`TASK-07` (Page Route & Verification — 1–3 files):** Mount component into route/page, add seed/test verification, and fill out the **Completion & Future Extension Notes** section.
   *(Omit backend tasks for Frontend-Only projects; omit frontend tasks for Backend-Only projects.)*
3. **Every Microtask Must Have a Verification Command:**
   - Specify how to verify `TASK-0X` immediately after editing its 1–3 files (e.g., `pnpm tsc --noEmit`, `go build ./...`, `mvn test-compile`, or running a targeted test).

---

## 4. Step 4: Review Gate & Step-by-Step Microtask Execution

1. **Mandatory Pause After Writing `docs/tasks/00X-<slug>.md`:**
   - Present a concise summary of the generated microtasks (`TASK-01` through `TASK-0N`) and ask the developer:
     *"I have generated the microtask plan in `docs/tasks/00X-<slug>.md`. Ready for me to start with `TASK-01`?"*
2. **Execute Strictly 1 Microtask at a Time:**
   - When the developer approves:
     1. Read the active microtask (`TASK-0X`) and load any chained skill (`api-contract`, `nestjs-core`, `nextjs-core`) if relevant.
     2. Create or edit **only the 1–3 files listed in `TASK-0X`**.
     3. Run the microtask's **Verification Check** (typecheck/lint/test). Fix any issue immediately before moving on.
     4. Mark `- [x]` as completed in `docs/tasks/00X-<slug>.md`.
     5. Proceed to the next microtask.
3. **Task Completion & Future Continuity Sync:**
   - Once all microtasks in `docs/tasks/00X-<slug>.md` are `[x]`:
     - Fill out **Section 6 (`Where We Ended & Future Extension Notes`)** at the bottom of `docs/tasks/00X-<slug>.md` (listing exact files touched, what was completed, and how future iterations can extend this feature).
     - Update the row in **`docs/tasks/README.md`** to `Completed` (with completion date).
     - Update the feature's status to `Built` in `docs/PRD.md` (if `docs/PRD.md` exists).

---

## 5. Verification Checklist

- [ ] Checked `docs/tasks/README.md` (creating it if missing in a legacy repo) and inspected relevant codebase files.
- [ ] Asked 2–4 focused feature/edge-case questions via `ask_question`.
- [ ] Created `docs/tasks/00X-<slug>.md` with sequential microtasks capped at **1–3 files per microtask** + verification commands.
- [ ] Paused for developer review before executing `TASK-01`, executed 1 microtask at a time, and updated `Where We Ended & Future Extension Notes` + `docs/tasks/README.md` upon completion.
