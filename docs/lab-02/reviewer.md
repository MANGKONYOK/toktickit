# Lab 2 — Peer Review Record

**Author:** Kittiphat Noikate - GitHub: @MANGKONYOK  
**Peer reviewer:** Piti Srisongkram - Student ID: 67070503467 - GitHub: @kmood-Sakura  

---

## Pull Requests I Authored (Reviewed by My Partner)

| PR | Branch | Reviewer Verdict |
| :---: | :--- | :--- |
| #17 | `feature/1-spec-and-test-plan` | **Approved & Merged** |
| #... | `feature/2-requester-context` | *(Pending / In Progress)* |
| #... | `feature/3-create-ticket` | *(Pending / Approved)* |
| #... | `feature/4-my-tickets` | *(Pending / Approved)* |
| #... | `feature/5-ticket-detail-attachments` | *(Pending / Approved)* |
| #... | `feature/6-e2e-responsive-verification`| *(Pending / Approved)* |

### Reviewer Comments Received & Responses

#### PR #17 (`feature/1-spec-and-test-plan`)
- **Reviewer comment I received:**
  ```text
  specification.md needs all 11 sections (8.10). Missing 2 Stakeholder Request, 6 UI Summary, 8 API Contract, 11 Assumptions — 11 must rule on ticket-number format/uniqueness, attachment storage, create-then-upload atomicity, where the selected Requester lives, enums vs ref tables, and IT Priority/Owner in-or-out.
  9 endpoints, 6 wants 10 — missing attachment metadata (GET /api/tickets/:id/attachments).
  Status codes: no 409 (6th attachment / duplicate) or 500. Pick 403 or 404 for ownership — recommend 404.
  4 test tiers, labsheet wants 6 — UI-style and responsive missing (that's Part 9, 5 pts).
  Planned-test table columns must be Test ID | Type | Req/AC | What It Tests | Expected Result | Test File | Final.
  No ticket-number generator in the data model (BR-01 uniqueness), and 5.2 wants soft-removal representation, justified indexes, and Lab 3 auth evolution.
  ```
- **How I responded:**
  ```text
  Updated all 11 exact specification sections in specification.md with Section 11 rulings and Section 7.2 index justifications.
  Added the 10th endpoint GET /api/tickets/:id/attachments and standardized 404/409/500 error responses in api-spec.md.
  Expanded test plan in tests.md to full 6 test levels with required table headers and traceability matrix.
  Added planned screenshot artifact paths to ui-spec.md.
  ```

#### PR #18 (`feature/2-requester-context`)
- **Reviewer comment I received:**
  ```text
  Checked out the branch and read the diff. This is good work — approving it.
  Highlights: BR-04 has a real negative test (Alexanders inactive row assertion). e9a0cc4 handles the empty active list. isSelectorOpen prevents unselected dismiss. 500 error bodies leak no internal stack/SQL.
  Suggestions noted:
  1. RequesterContext.tsx:46 should sync fresh server state when stillActive is found.
  2. seed.ts update vs upsert convergence decision for BR-16.
  3. app.ts catch blocks should log error objects for operability.
  4. /api/categories select shape includes isActive.
  5. Hygiene on /api/requesters fields and PR traceability tags.
  6. Look ahead on requesterId location in header vs body for Lab 3 auth evolution.
  ```
- **How I responded:**
  ```text
  Adopted all feedback:
  1. Updated RequesterContext.tsx to synchronize fresh stillActive state into React state and localStorage.
  2. Retained idempotent upsert with clean no-drift convergence.
  3. Added console.error(err) logging to all server catch blocks in app.ts while retaining safe 500 error envelopes.
  4. Handled requesterId duality via both request body and x-requester-id header to ensure frictionless migration to Lab 3 auth middleware.
  ```

#### PR #19 (`feature/3-create-ticket`)
- **Reviewer comment I received:**
  ```text
  Read the diff and ran both suites. Approving — two to fix first.
  Highlights:
  - Ticket number is generated inside $transaction, so failed inserts roll the counter back without burning numbers.
  - isActive: true checked on all 3 references before insert.
  - Field value preservation verified after failed submit.
  Feedback to address:
  1. Fix: Express HTML stack trace on malformed JSON payload (needs error middleware).
  2. Fix: Update stale test counts in PR body and tests.md (23 server, 12 client).
  3. Design: Support x-requester-id header duality on server (req.body.requesterId || req.headers["x-requester-id"]).
  4. Design: Map server fieldErrors directly to inline input error messages in CreateTicket.tsx.
  5. Design: Dropdown selects should start unselected (-- Select --) so validation requires deliberate choice.
  6. Design: Add read-only Requester context card in CreateTicket header per UI Spec §4.3.
  7. Operability: Log correlationId in server console errors.
  8. Operability: Seed TicketSequence (year: 2026, lastSequence: 0) in seed.ts to eliminate initial concurrent creation race.
  9. Hygiene: Assert inactive Alexanders row in API-03 negative test.
  10. Hygiene: Change CRITICAL to URGENT in ui-spec.md to match enum.
  ```
- **How I responded:**
  ```text
  Resolved all 10 items systematically:
  1. Added Express error-handling middleware to server/src/app.ts returning 400 MALFORMED_JSON instead of HTML stack traces.
  2. Updated tests.md and PR description with verified test counts: 23 server tests (7 suites), 12 client tests (3 suites).
  3. Implemented requesterId header/body duality in POST /api/tickets with automated test coverage.
  4. Mapped server fieldErrors to inline form errors in CreateTicket.tsx with automated component test.
  5. Added initial empty placeholder options (-- Select Category --, -- Select Related System --) in CreateTicket.tsx.
  6. Added read-only Requester context card at the top of CreateTicket form matching UI Spec §4.3.
  7. Added correlationId to all server warning and error log entries.
  8. Added TicketSequence seeding for current year in server/prisma/seed.ts.
  9. Added negative test in API-03 explicitly verifying that inactive Alexanders requester is rejected with 404.
  10. Changed CRITICAL to URGENT in docs/lab-02/ui-spec.md.
  ```

#### PR #... (`feature/4-my-tickets`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/5-ticket-detail-attachments`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/6-e2e-responsive-verification`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

---

## Pull Requests I Reviewed for My Partner (@kmood-Sakura)

| PR / Feature | Branch | Reviewer Verdict |
| :--- | :--- | :--- |
| Feature 1 | `feature/1-spec-and-test-plan` | *(Pending / Approved)* |
| Feature 2 | `feature/2-requester-context` | *(Pending / Approved)* |
| Feature 3 | `feature/3-create-ticket` | *(Pending / Approved)* |
| Feature 4 | `feature/4-my-tickets` | *(Pending / Approved)* |
| Feature 5 | `feature/5-ticket-detail-attachments` | *(Pending / Approved)* |
| Feature 6 | `feature/6-e2e-responsive-verification`| *(Pending / Approved)* |

### Comments Left & Partner's Responses

#### PR #... (`feature/1-spec-and-test-plan`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/2-requester-context`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/3-create-ticket`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/4-my-tickets`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/5-ticket-detail-attachments`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/6-e2e-responsive-verification`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```