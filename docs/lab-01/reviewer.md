# Lab 1 — Peer Review Record

**Author:** Kittiphat Noikate — GitHub: @MANGKONYOK
**Peer reviewer:** Piti Srisongkram — Student ID: 67070503467 — GitHub: @kmood-Sakura

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved (after updating docs) |
| #6 | feature/2-health-check | Approved (paired workflow with Feature 3) |
| #7 | feature/3-category-seed | Approved (after updating README setup steps) |
|    | feature/4-category-list | Pending |

### Reviewer Comments Received & Responses

#### PR #5 (`feature/1-project-foundation`)
- **Reviewer comment I received:** `Pending documents included ai_use, tests.`
- **How I responded:** Completed all prompt logs, tool usages, and AI reflections in `docs/lab-01/ai_use.md`, initialized the test harness structure in `docs/lab-01/tests.md`, committed the documentation changes, and pushed to the branch before merging into `lab1-staging`.

#### PR #6 (`feature/2-health-check`) & PR #7 (`feature/3-category-seed`)
- **Reviewer comment I received:** `The health check is verified. The schema is faithful to the spec and the seed is genuinely idempotent. Committing migration_lock.toml alongside the migration is good catch and prevents drift. The sequential for...of upsert gives deterministic IDs (Account and Access=1 ... Network=4), which is precisely what the Issue 4 "in id order" assertion depends on. Feedback: In README.md, migrate and seed steps are missing between install and running locally.`
- **How I responded:** Added Step 5 (Database Migration and Seeding: `npx prisma migrate dev` and `npm run prisma:seed`) into `README.md`, renumbered subsequent steps, explicitly noted deterministic ID generation (1..4) in the PR description for Issue 4's dependency, and pushed the updates to the branch.

## Pull Requests I reviewed for my partner
- **My comment:** <fill in comment left on partner's PR>
- **Partner's response:** <fill in partner's response>