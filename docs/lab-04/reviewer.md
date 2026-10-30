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
| #2 | `lab4-feature/2-actions-taken-backend` | `lab4-staging` | Database Migration, ActionTaken Model, Idempotent Seeds, REST APIs, Session Binding, and Integration Tests | *Planned* |
| #3 | `lab4-feature/3-actions-taken-ui` | `lab4-staging` | Actions Taken Timeline on Ticket Detail, Create/Edit Modals, Dynamic Follow-Up Toggle, Requester Read-Only View, and Component Tests | *Planned* |
| #4 | `lab4-feature/4-workflow-resolution` | `lab4-staging` | 8-State Lifecycle Engine, Authoritative Resolution Gate, Optimistic Concurrency Detection (HTTP 409), and Conflict Dialog | *Planned* |
| #5 | `lab4-feature/5-dashboards` | `lab4-staging` | Requester & IT Staff Dashboard Endpoints, PostgreSQL Aggregate Calculations, Metric Cards UI, and Drill-Down Routing | *Planned* |
| #6 | `lab4-feature/6-hardening-and-polish` | `lab4-staging` | Zero Horizontal Scroll Responsive Polish, WCAG 2.1 AA Accessibility, Visual Hierarchy, and Safe Error State Hardening | *Planned* |
| #7 | `lab4-feature/7-e2e-and-release` | `lab4-staging` | Playwright Multi-Viewport E2E Test Suites, 100% Labs 1-3 Regression Verification, Final DoD Sign-off, and Main Release | *Planned* |

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

### PR #2: Actions Taken Database & Backend APIs (`lab4-feature/2-actions-taken-backend`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #2 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #2 creation]
  ```

---

### PR #3: Actions Taken Ticket Detail UI (`lab4-feature/3-actions-taken-ui`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #3 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #3 creation]
  ```

---

### PR #4: Ticket Workflow & Concurrency Gate (`lab4-feature/4-workflow-resolution`)

- **Peer Reviewer Comment (@kmood-Sakura):**

  ```text
  [Pending PR #4 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #4 creation]
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
  [Pending PR #7 creation]
  ```

- **How I Responded:**

  ```text
  [Pending PR #7 creation]
  ```
