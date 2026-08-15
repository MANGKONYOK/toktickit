# Lab 1 — Peer Review Record

**Author:** Kittiphat Noikate — GitHub: @MANGKONYOK
**Peer reviewer:** Piti Srisongkram — Student ID: 67070503467 — GitHub: @kmood-Sakura

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved (after updating docs) |
| #6 | feature/2-health-check | Approved (paired workflow with Feature 3) |
| #7 | feature/3-category-seed | Approved (after updating README setup steps) |
| #8 | feature/4-category-list | Changes requested (robust ID assertions) → Approved |

### Reviewer Comments Received & Responses

#### PR #5 (`feature/1-project-foundation`)
- **Reviewer comment I received:** `Pending documents included ai_use, tests.`
- **How I responded:** Completed all prompt logs, tool usages, and AI reflections in `docs/lab-01/ai_use.md`, initialized the test harness structure in `docs/lab-01/tests.md`, committed the documentation changes, and pushed to the branch before merging into `lab1-staging`.

#### PR #6 (`feature/2-health-check`) & PR #7 (`feature/3-category-seed`)
- **Reviewer comment I received:** `The health check is verified. The schema is faithful to the spec and the seed is genuinely idempotent. Committing migration_lock.toml alongside the migration is good catch and prevents drift. The sequential for...of upsert gives deterministic IDs (Account and Access=1 ... Network=4), which is precisely what the Issue 4 "in id order" assertion depends on. Feedback: In README.md, migrate and seed steps are missing between install and running locally.`
- **How I responded:** Added Step 5 (Database Migration and Seeding: `npx prisma migrate dev` and `npm run prisma:seed`) into `README.md`, renumbered subsequent steps, explicitly noted deterministic ID generation (1..4) in the PR description for Issue 4's dependency, and pushed the updates to the branch.

#### PR #8 (`feature/4-category-list`)
- **Reviewer comment I received:**
  ```text
  good to see the compiled .js artifacts removed and "noEmit": true added to client/tsconfig.json — that resolves the PR #5 item, and ai_use.md prompt #10 records it honestly as the cause of the ESM mock trouble. The .gitignore guard is now optional belt-and-braces; noEmit alone prevents a recurrence.
  Feedback & Suggestions:
  server/tests/lab-01/categories.test.ts — the assertion is tied to autoincrement ids: This is the one I would change before merging. The test hits the real database and asserts [{ id: 1, ... }, { id: 2, ... }, …] exactly. id comes from a Postgres sequence, which does not reset when rows are deleted, so the moment anyone re-runs a migration on a dirty volume, deletes and re-seeds, or runs prisma migrate reset at a different point in the sequence, the categories come back as ids 5–8 and the test goes red while the endpoint is working perfectly. Asserting the ordering rather than the literal ids keeps the actual requirement ("in id order") intact and survives a re-seed.
  ```
- **How I responded:**
  ```text
  Updated server/tests/lab-01/categories.test.ts to decouple the test from literal sequence IDs (1..4). The revised test asserts that res.body returns 4 categories with names in the exact expected order (["Account and Access", "Hardware", "Software", "Network"]) and validates that each id is a valid number strictly ascending (ids[i] > ids[i - 1]). This keeps the "in id order" requirement 100% verified while ensuring full resilience against sequence increments from database resets or re-seeding. Re-ran test suites and verified all tests pass.
  ```

---

## Pull Requests I reviewed for my partner (@kmood-Sakura)

| PR / Feature | Branch | Reviewer verdict |
|--------------|--------|------------------|
| Feature 1 | feature/1-project-foundation | Changes requested (docs & cross-platform testing) → Approved |
| Feature 2 | feature/2-health-check | Approved |
| Feature 3 | feature/3-category-seed | Changes requested (resolve doc merge conflicts) → Approved |
| Feature 4 | feature/4-category-list | Approved |

### Comments Left & Partner's Responses

#### PR #1 (`feature/1-project-foundation`)
- **My comment:**
  ```text
  Feedback & Suggestions:
  1. docs/lab-01/ai_use.md: Currently lists 4 key prompts. Remember to append prompts for Features 2–4 to satisfy the 6–10 prompt requirement before compiling the final submission PDF.
  2. docs/lab-01/tests.md: Under T1.5, the Bash here-string <<< 'SELECT 1;' might fail on Windows PowerShell. Consider replacing it with echo "SELECT 1;" | npx prisma db execute --stdin for cross-platform compatibility.
  3. docs/lab-01/reviewer.md: Verification checklist (R1.1–R1.6) is well-structured. I will run these checks on my local machine and record the results for our reciprocal review log.
  ```
- **Partner's response:**
  ```text
  docs/lab-01/ai_use.md: My decision is to use least AI prompt, with highest performance. Action plan:
  1. Summary Instructions from PDF into markdown files, separated by purpose: Doc.md (instructions), Solve-Issue.md (action plan), README.md (current work).
  2. Confirm understanding.
  3. Setup and planning action to scope our work into steps (e.g. README.md progress, test setup, issue resolution).
  4. Execute Feature 1 instructions and recap.
  docs/lab-01/tests.md: Thanks I will try it.
  docs/lab-01/reviewer.md: Thanks
  ```

#### PR #2 (`feature/2-health-check`)
- **My comment:**
  ```text
  Good job! Everything adheres to the specification.
  Highlights:
  - API Health Contract: Clean, stateless GET /api/health returning exact { status: "ok", service: "TokTickIT API" } with HTTP 200.
  - Proper Fetch Validation: Checking !health.ok is spot on preventing HTTP 500 errors from falsely passing as "Online".
  - Scope Discipline: Scope is well bounded for Feature 2; TODO(Issue 4) hooks are cleanly preserved for category seeding and list features.
  - Tests & Docs: Supertest and Vitest test suites are green with clear test evidence and SemVer bump (v1.2.0).
  The overview is excellent! I will approve and merge it soon.
  ```

#### PR #3 (`feature/3-category-seed`)
- **My comment:**
  ```text
  Resolve docs merge conflict to merge.
  Highlights:
  - Schema Design: name @unique enforces data integrity at the PostgreSQL engine level.
  - Idempotency: prisma.category.upsert({ where: { name }, update: {}, create: { name } }) is completely idempotent; re-seeding leaves existing record timestamps untouched.
  - Clean Scope: Strictly focused on the data layer with zero code leaks into API or UI.
  - Merge Conflict: Conflicts in README.md, reviewer.md, and tests.md are purely due to parallel documentation updates from Feature 2. Combining the logs from both features will resolve it cleanly.
  Once the 3 documentation conflicts are resolved, this is ready to merge into lab1-staging.
  ```
- **Partner's response:**
  ```text
  I just solved it by my own hand.
  ```

#### PR #4 (`feature/4-category-list`)
- **My comment:**
  ```text
  You are complete and full-stack implementation for Feature 4.
  - API Layer: GET /api/categories correctly uses orderBy: { id: "asc" } for deterministic ordering and returns a sanitized HTTP 500 error on database failure.
  - Frontend & UI: checkSystem() safely chains health and categories checks, and App.tsx handles loading, online, and offline states cleanly.
  - Testing: All 10 automated test suites across Supertest and Vitest pass with 0 skipped and 0 todos.
  - Feature 2 documentation was cleanly restored. Ready to merge into lab1-staging.
  ```