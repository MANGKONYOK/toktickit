# Lab 4 — Peer Review Record

**Author:** Kittiphat Noikate - Student ID: 67070503459 - GitHub: @MANGKONYOK  
**Peer Reviewer:** Piti Srisongkram - Student ID: 67070503467 - GitHub: @kmood-Sakura  
**Target Integration Branch:** `lab4-staging`  
**Final Upstream Branch:** `main`

---

## Pull Requests Authored by Kittiphat Noikate (Reviewed by @kmood-Sakura)

| PR | Feature Branch | Target Branch | Scope / Feature Area | Reviewer Verdict |
| :---: | :--- | :--- | :--- | :---: |
| #1 | `lab4-feature/1-spec-and-test-plan` | `lab4-staging` | Sprint 4 Engineering Contract, Actions Taken Schema, Concurrency Gate, Dashboard Metrics, and 8-Tier Test Architecture | **Changes Addressed & Ready** |
| #2 | `lab4-feat/2-action-taken` | `lab4-staging` | Database Migration, ActionTaken Model, Idempotent Seeds, REST APIs, Session Binding, UI Timeline, and Automated Tests | **Changes Addressed & Ready** |
| #3 | `lab4-feature/3-workflow-resolution` | `lab4-staging` | 8-State Lifecycle Engine, Authoritative Resolution Gate, Optimistic Concurrency Detection (HTTP 409), and Conflict Dialog | **Ready for Review** |
| #4 | `lab4-feature/4-dashboards` | `lab4-staging` | Requester & IT Staff Dashboard Endpoints, PostgreSQL Aggregate Calculations, Metric Cards UI, and Drill-Down Routing | *Planned* |
| #5 | `lab4-feature/5-hardening-and-polish` | `lab4-staging` | Zero Horizontal Scroll Responsive Polish, WCAG 2.1 AA Accessibility, Visual Hierarchy, and Safe Error State Hardening | *Planned* |
| #6 | `lab4-feature/6-e2e-and-release` | `lab4-staging` | Playwright Multi-Viewport E2E Test Suites, 100% Labs 1-3 Regression Verification, Final DoD Sign-off, and Main Release | *Planned* |

---

## Detailed Peer Review Logs

### PR #1: Sprint 4 Engineering Contract & Test Architecture (`lab4-feature/1-spec-and-test-plan`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  Read `860f987` against `lab4-staging` — six documents, +1147, no code. The pre-implementation discipline is right this time and I checked it rather than took it. One line in `ui-spec.md` needs to go before this merges.

  ---

  | # | features | status |
  | - | -------- | ------ |
  | 1 | The contract is genuinely pre-implementation — 10 DoD boxes unticked, all 55 test rows `Planned`, nothing claimed green | pass |
  | 2 | Every count in the body holds — 16 FR, 25 BR, 22 AC, measured | pass |
  | 3 | The two database justifications are real decisions with consequences, not restatements of the schema | pass |
  | 4 | `ui-spec.md:217` binds a UI rule to a file nobody but you can open | issue |

  Blocks the merge: #4. Nothing else does.

  #### Issues

  | # | issues | reason |
  | - | ------ | ------ |
  | 4 | `ui-spec.md:217` reads "Per [AGENTS.md](file:///c:/Users/KITTIPHAT%20NOIKATE/Desktop/SoftEn_Lab/agents_md/AGENTS.md) work norms, invalid inputs during general typing clear on blur" | Three things at once: the link is dead for every reader, it publishes your local directory layout, and — the part that matters — a graded contract is citing an authority that is not in the repository, so nobody can check the rule against its source. State the blur rule on its own terms and the sentence stands without the reference. It is the only `file:///` left in `docs/lab-04/`; the rest of the branch is clean. |

  #### Warning

  none

  On row 1: this is the thing Feature 1 of Lab 3 got wrong, where the same boxes were ticked against a branch with no code. Here `specification.md` has 0 ticked and 10 unticked, and `tests.md` has 55 `Planned` and 0 `Pass`. That is what a contract written before the implementation looks like.

  Your PR description carries the same `file:///c:/Users/...` links in several places. Those are description-only and cost nothing in the repository, so I am not raising them — but relative paths render and these do not.
  ```

- **How I Responded:**

  ```text
  Agreed completely with the peer review and resolved Issue #4:
  1. Removed External Authority Citation & file:/// URI:
     - In `docs/lab-04/ui-spec.md:217`, stripped the external `file:///` hyperlink to `AGENTS.md`.
     - Rephrased the validation blur rule on its own terms:
       "Field-level validation errors clear on blur or correction as the user types."
  2. Repository Hygiene:
     - Verified that `docs/lab-04/` is 100% free of local absolute file paths and dead external links.
     - Updated PR description hyperlinks on GitHub to use repository-relative markdown paths.
  ```

---

### PR #2: Actions Taken Full Vertical Slice (`lab4-feat/2-action-taken`)

- **Author Implementation Notes:**
  - **Database Increment & Prisma Migration:** Added `ActionTaken` model with 1:N relations under `Ticket` (cascade deletion) and `User` (performer), composite index `[ticketId, actionDateTime]`, and applied non-destructive migration `20261002090000_add_action_taken_model`.
  - **Idempotent Seed Enhancement:** Seeded tickets across various statuses with 0, 1, and multi-staff actions taken, conditional follow-up note requirements, and attachment references with re-run safety.
  - **Domain Validation & Rules:** Implemented `validateActionTakenInput` and `isTerminalTicketStatus` enforcing strict text bounds (1..2000 chars for `description` and `result`), conditional mandatory note for `followUpRequired=true` (1..1000 chars), and terminal state locks.
  - **Backend REST APIs:** Implemented `POST /api/tickets/:id/actions`, `GET /api/tickets/:id/actions`, and `PATCH /api/tickets/:id/actions/:actionId` with strict session actor derivation (`req.user.id`), anti-enumeration defense returning 404 for unowned tickets, and terminal state rejection (HTTP 400).
  - **Frontend UI & Timeline:** Created `ActionsTakenSection.tsx` conforming to Zen Green design tokens, rendering action cards, performer badges, follow-up alerts, and create/edit modal with dynamic follow-up note toggling. Seamlessly mounted in `StaffTicketDetail.tsx` (create/edit enabled) and `TicketDetail.tsx` (requester read-only).
  - **Automated Tests:** 100% passing across 16 unit tests, 14 API tests, and 7 client component tests (`UNIT-01`, `UNIT-02`, `API-01..04`, `UI-01..02`, `STYLE-01..02`, `AUTH-01..03`). Full regression suite: 227/227 server tests and 82/82 client tests passing.

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  Read `d082a5c..e3ea058` against `lab4-staging` — model, migration, seed, validator, three endpoints, the timeline component and 37 new tests. The server slice is solid and the seed problem from Lab 3 is properly fixed. One row in `tests.md` is marked `Pass` without a test behind it, and that has to go before this merges.

  ---

  | # | features | status |
  | - | -------- | ------ |
  | 1 | Performer identity is bound from the session and the requester scope check matches the house pattern, so BR-02 and BR-14 hold | pass |
  | 2 | The seed is idempotent and pushes `TicketSequence` to 4, so app-created tickets cannot collide with the four fixtures | pass |
  | 3 | The migration is additive only and every count in your body measures true — 16 unit, 14 API, 7 component, 22 server files, 16 client files | pass |
  | 4 | `tests.md:71` marks `STYLE-01` `Pass`, but no style assertion exists anywhere in `client/tests/lab-04/` | issue |
  | 5 | `client/src/api.ts` came back with CRLF line endings, so 101 real lines arrive as 1,897 | warning |
  | 6 | `actions-taken.api.test.ts` creates tickets and actions and never deletes them, unlike your Lab 2 and Lab 3 suites | warning |

  Blocks the merge: #4. Rows 5 and 6 do not.

  #### Issues

  | # | issues | reason |
  | - | ------ | ------ |
  | 4 | `STYLE-01` promises "computed styles utilize CSS variables; zero raw hardcoded colors" and is now `Pass`; `STYLE-02` is `Pass` on a test that only checks the follow-up box renders and reads "Follow-Up Required" | No test in `client/tests/lab-04/` touches `getComputedStyle`, `toHaveStyle`, a `--zg-` token or a colour at all, and `ActionsTakenSection.tsx` carries 23 raw hex values with no token behind them, so the claim is not merely untested but false. This is the same shape as Lab 3 Feature 1 — a graded row saying `Pass` where nothing verified it. Either assert the tokens, or put both rows back to `Planned` and let the style tier land with the dashboards. |

  #### Warning

  | # | warnings | reason |
  | - | -------- | ------ |
  | 5 | The whole of `api.ts` is rewritten because the file was saved with CRLF and CR terminators; `git diff -w` shows the real change is 101 added lines | Nothing breaks, but a reviewer cannot see what changed in a 1,897-line diff, and the next person to touch that file inherits the churn. `git config core.autocrlf input` on your side and one commit normalising the file would settle it for the rest of the sprint. |
  | 6 | The suite creates an active ticket, a closed ticket and their actions in `beforeAll` with no `afterAll` cleanup | Your `staff-queue`, `staff-ticket-detail` and `users-admin` suites all clean up, so this is a departure from your own convention. It matters next feature, not now: `API-05` and `API-07` assert dashboard counts "strictly match database state", and every run of this file adds rows those counts will see. |
  ```

- **How I Responded:**

  ```text
  Agreed completely with peer reviewer @kmood-Sakura and resolved all issues and warnings systematically:

  1. Reset Premature Style Tests in tests.md (Issue #4):
     - Reverted `STYLE-01` ("Dashboard metric cards adopt Zen Green tokens") and `STYLE-02` ("Follow-up required badge adopts amber/orange token") from `Pass` back to `Planned`.
     - The style tier and computed style token tests will land legitimately during the Dashboard increment (Feature 4) when dashboard metric cards are constructed.

  2. Line Ending Normalization (Warning #5):
     - Configured `core.autocrlf input` and normalized `client/src/api.ts` with LF line endings.
     - Cleaned the diff against `lab4-staging` to display strictly the +101 lines of Action Taken interfaces and endpoints without whitespace churn.

  3. Database Teardown in API Tests (Warning #6):
     - Added an `afterAll` hook in `server/tests/lab-04/actions-taken.api.test.ts` cleaning up the created active and closed test tickets along with all child actions.
     - Preserves complete test database isolation and prevents skewing dashboard aggregate count assertions in Feature 4.
  ```

---

### PR #3: Ticket Workflow & Concurrency Gate (`lab4-feature/3-workflow-resolution`)

- **Author Implementation Notes:**
  - **8-State Governed Lifecycle Machine (`UNIT-03`, `AC-10`):** Enforced pure transition validation in `isValidStatusTransition` across all 8 ticket states (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), disallowing self-transitions and illegal skips (e.g., `NEW -> RESOLVED`, `OPEN -> CLOSED`).
  - **Authoritative Resolution Gate (`FLOW-02`, `AC-09`):** Protected status transitions to `RESOLVED` via `PATCH /api/tickets/:id/status` (and alias `/api/staff/tickets/:id/status`), strictly limiting them to `IT_STAFF` and `ADMIN` roles. Requesters calling status update endpoints are rejected with HTTP 403 Forbidden.
  - **Advisory Requester Resolution Seam (`FLOW-01`, `AC-08`):** Implemented `PATCH /api/tickets/:id/resolve` (and alias `/resolve-indication`), setting `resolvedByRequester = true` and logging an audit comment while preserving current ticket status (`OPEN` / `IN_PROGRESS`). Enforced anti-enumeration defense returning HTTP 404 for unowned tickets.
  - **Optimistic Concurrency Control (`FLOW-03`, `AC-11`):** Status mutation routes accept `expectedUpdatedAt` and compare against `ticket.updatedAt`. Stale requests are rejected with HTTP 409 Conflict returning structured payload (`code: "CONCURRENCY_CONFLICT"`, `details: { currentUpdatedAt, currentStatus }`).
  - **Terminal State Mutability Locks (`FLOW-04`, `AC-12`):** Locked `CLOSED` and `CANCELLED` tickets against status updates, actions taken creation, and problem resolution indications, returning HTTP 400 Bad Request (`TICKET_TERMINAL_LOCKED` / `INVALID_STATUS_TRANSITION`).
  - **Frontend Concurrency UI & Conflict Banner:** Extended `api.transitionTicketStatus` to accept `expectedUpdatedAt` and propagate 409 conflict details. In `StaffTicketDetail.tsx`, rendered Zen Green warning banner (`data-testid="concurrency-conflict-banner"`) with "Reload Latest Ticket Data" CTA, dynamically updating available next statuses upon reload.
  - **Automated Test Coverage:** Added 13 unit tests (`workflow-engine.unit.test.ts`), 12 API integration tests (`ticket-workflow.api.test.ts`), and 4 component tests (`WorkflowConcurrency.test.tsx`). 100% passing across 252 server tests and 86 client tests with complete teardown cleanup in `afterAll`.

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending review]
  ```

- **How I Responded:**

  ```text
  [Pending review]
  ```

---

### PR #5: Role Dashboards (`lab4-feature/5-dashboards`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #5 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #5 creation]
  ```

---

### PR #6: Final Hardening, Accessibility & Polish (`lab4-feature/6-hardening-and-polish`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #6 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #6 creation]
  ```

---

### PR #7: Multi-Viewport E2E Suites & Release Prep (`lab4-feature/7-e2e-and-release`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #6 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #6 creation]
  ```


---

## Pull Requests I Reviewed for My Partner (@kmood-Sakura)

**Partner Repository:** `https://github.com/kmood-Sakura/toktickit`

| PR / Feature | Branch | Target Branch | Review Scope | Reviewer Verdict |
| :--- | :--- | :--- | :--- | :---: |
| Feature 1 | `lab4-feature/1-sprint-contract` | `lab4-staging` | Sprint 4 Engineering Contract, Actions Taken Schema, Concurrency Gate, Dashboards & 10-Tier Test Architecture | **APPROVED** |
| Feature 2 | `lab4-feature/2-actions-foundation` | `lab4-staging` | Actions Taken Data Model, Additive Migration & Rollback, Idempotent Seed, 4 REST Routes, Pure Validation & Transition Modules, Administrator RBAC Widening | **Changes Addressed & Approved** |

---

### Reviews Given to Partner (@kmood-Sakura)

#### Feature 1: Sprint 4 Engineering Contract & Test Architecture (`lab4-feature/1-sprint-contract`)

- **Review comments provided to partner:**

  ```text
  Read `299b957` against `lab4-staging` — six documents, +2016 −18, no application code. The pre-implementation discipline is airtight, the traceability is bidirectional, and all numbers hold.

  ---

  | # | features | status |
  | - | -------- | ------ |
  | 1 | Genuine pre-implementation discipline — 32 DoD boxes unticked, all 170 test rows `Planned`, 17 UI checklist rows `pending`, zero code claimed | pass |
  | 2 | Every count in the body holds — 34 FR, 54 BR, 57 AC, 170 tests across 17 test files, measured | pass |
  | 3 | Bidirectional requirement traceability — all 34 FRs cited by ACs, and all 57 ACs cited by tests in tests.md | pass |
  | 4 | Clean links and repository hygiene — zero file:/// links, zero local directory leaks, all relative links resolve | pass |
  | 5 | Version declared uniformly at 4.1.0 across package.json, README.md, and all 4 spec documents | pass |
  | 6 | reviewer.md Section 1 table has empty rows; README header cites "cut from lab3-staging" | note |

  **Nothing blocks the merge. Approving PR.**
  ```

- **Partner's response & resolution:**

  ```text
  No blocking issues raised. Acknowledged notes regarding reviewer identity table rows in reviewer.md and README branch wording. Merged into lab4-staging via PR #34 (commit 88b4880).
  ```


---

#### Feature 2: Actions Taken Backend Foundation (`lab4-feature/2-actions-foundation`)

- **Review comments provided to partner:**

  ```text
  Read `0b7cc6c` against `lab4-staging` — 23 files, +2251 −148. Outstanding backend craftsmanship throughout: the additive migration with tested down.sql, pure modules for lifecycle and validation, atomic updateMany version increment for optimistic concurrency, and the rollback proof baseline fix in 0b7cc6c.

  One blocking contract discrepancy needs attention before merging:

  ---

  | # | features | status |
  | - | -------- | ------ |
  | 1 | Additive migration, down.sql, and idempotent seed with 9 actions | pass |
  | 2 | Pure lifecycle (5 edges) and multi-field validation modules | pass |
  | 3 | Optimistic locking on UPDATE via version and four 409 error bodies | pass |
  | 4 | Administrator widening on staff ticket, attachment, comment and note routes | pass |
  | 5 | Suite expansion: 284 tests across 25 files passing, clean types | pass |
  | 6 | GET /api/staff/users does not return Administrators or role (A-01 / api-spec §5) | issue |

  **Blocks the merge: #6.**

  #### Issues

  | # | issues | reason |
  | - | ------ | ------ |
  | 6 | `server/src/routes/staff.ts:40` still restricts `GET /api/staff/users` to `{ role: "IT_STAFF", isActive: true }` and projects only `{ id, fullName }` | `specification.md` Assumption A-01 and `api-spec.md` Section 5 explicitly state that `GET /api/staff/users` must return active IT Staff AND Administrators, each as `{ id, fullName, role }`. In Feature 3, the action performer select needs to list both roles, while the Ticket Owner select filters to `IT_STAFF`. Leaving this query restricted to IT Staff prevents Administrators from appearing in the performer select. |

  #### Non-blocking Notes

  - Precedence order of simultaneous refusals: As noted in your PR description, adding an automated test in Feature 4 verifying the exact check order (e.g., `TICKET_TERMINAL` before `STALE`) will close the loop.
  ```

- **Partner's response & resolution:**

  ```text
  Resolved both items in commit 5041e40 (v4.2.2):
  1. GET /api/staff/users Widening (Issue #6):
     - Updated server/src/routes/staff.ts:132 to query active IT_STAFF and ADMIN users, selecting { id, fullName, role }, ordered by fullName then id.
     - In client/src/api.ts, exported fetchStaffUsers() returning all active staff with their roles (for Feature 3 Performer selection), and updated fetchAssignableOwners() to filter to role === "IT_STAFF" so existing Ticket Owner dropdowns never offer Administrators.
     - Added/updated API-83 (server) verifying active staff list and UI-29b (client) verifying Administrator exclusion from owner dropdowns.
  2. Check-Order Precedence Verification:
     - Added test API-17b in server/tests/lab-04/actions-taken.api.test.ts verifying api-spec 1.2 check order: 400 before TICKET_TERMINAL, TICKET_TERMINAL before STALE and ACTION_TRANSITION, and STALE before ACTION_TRANSITION.
  3. Verification:
     - All 285 server tests and 115 client tests passing with zero TypeScript errors across both projects.
     - Verdict: APPROVED — Ready to merge into lab4-staging.
  ```
