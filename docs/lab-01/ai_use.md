# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini 3.7 Flash & 3.6 Flash)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Summarize Lab 1 requirements, issue dependencies, and test specifications | Adopted the structured breakdown of the 4 lab issues, documentation files, and Git Flow branching strategy. |
| 2 | Recommend report format, PDF submission structure, and grading evidence | Adopted the required submission sections and verified required markdown files (`ai_use.md`, `reviewer.md`, `tests.md`). |
| 3 | Plan and initialize Issue 1 project foundation and PostgreSQL Docker container | Provisioned the `toktickit-db` container (PostgreSQL 17 on port 5432), installed dependencies, and configured `.env`. |
| 4 | Diagnose Git pathspec error and isolate `toktickit` into an independent repository | Resolved working directory mismatches, created a clean `.git` repository, and pushed `lab1-staging` and `feature/1-project-foundation`. |
| 5 | Implement Issue 2 Health Check endpoint (`GET /api/health`) and run pre-flight tests | Implemented `/api/health` in Express `app.ts`, executed Vitest/Supertest suite with 0 failures, and documented evidence in `tests.md`. |
| 6 | Cross-reference Lab 1 Labsheet requirements for Issue 3 Category schema and seed | Verified `Category` model specifications (§9) and the 4 required categories with idempotency requirements. |
| 7 | Create branch `feature/3-category-seed`, apply Prisma migration, and implement idempotent seed | Added `Category` model to `schema.prisma`, ran `prisma migrate dev --name init`, and implemented idempotent category seeding with `upsert` in `seed.ts`. |

## Reflection
Structuring prompts to require an implementation plan and verification steps before executing actions made the agent responses much more reliable and aligned with the lab requirements. When Git commands failed due to working directory mismatches and nested repository conflicts with a previous project (`Vanz`), I prompted the agent to diagnose the root cause and isolate `toktickit` into its own dedicated Git repository. Cross-referencing requirements directly against the Lab 1 Labsheet guaranteed strict adherence to the schema, idempotency, and Kanban conventions.


