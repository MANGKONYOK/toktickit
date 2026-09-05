# Lab 2 — Peer Review Record

**Author:** Kittiphat Noikate - GitHub: @MANGKONYOK  
**Peer reviewer:** Piti Srisongkram - Student ID: 67070503467 - GitHub: @kmood-Sakura  

---

## Pull Requests I Authored (Reviewed by My Partner)

| PR | Branch | Reviewer Verdict |
| :---: | :--- | :--- |
| #17 | `feature/1-spec-and-test-plan` | **Approved & Merged** |
| #18 | `feature/2-requester-context` | **Approved & Merged** |
| #19 | `feature/3-create-ticket` | **Approved & Merged** |
| #20 | `feature/4-my-tickets` | **Approved & Merged** |
| #21 | `feature/5-ticket-detail-attachments` | **Approved & Merged** |
| #22 | `feature/6-e2e-responsive-verification`| **Review Addressed (Pending Approval)** |

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

#### PR #20 (`feature/4-my-tickets`)
- **Reviewer comment I received:**
  ```text
  1. [Issue - Blocker] ticket-query.ts:42 : query.requesterId ?? headers["x-requester-id"] puts query param first, so ?requesterId=<anyone> overrides header and defeats AC-03 isolation. client/src/api.ts:161 sends the param and :193 sends the header.
  2. [Issue - Blocker] my-tickets.api.test.ts : Nothing sends User A's identity and asks for User B's data to test true isolation defense.
  3. [Warning] app.ts:190 : orderBy: { [sortBy]: sortOrder } has no secondary key, so rows sharing a sort value can repeat or vanish across pages. Add id: "desc" tiebreaker.
  4. [Warning] app.ts:201 : list rows include email and department unnecessarily.
  5. [Warning] app.ts:109 : req-${Date.now()} can collide within the same millisecond; use randomUUID().
  ```
- **How I responded:**
  ```text
  Resolved all 5 items:
  1. Prioritized headers["x-requester-id"] ?? query.requesterId in ticket-query.ts and dropped query.set("requesterId", ...) from client/src/api.ts so client strictly uses header.
  2. Added an explicit anti-spoofing isolation test in my-tickets.api.test.ts (sending User A's header while querying ?requesterId=User_B) asserting User B's tickets are never returned.
  3. Added secondary sort key [{ [sortBy]: sortOrder }, { id: "desc" }] in app.ts for deterministic pagination.
  4. Restricted requester select to only { id: true, fullName: true } on list endpoint to avoid PII exposure.
  5. Replaced Date.now() with crypto.randomUUID() for collision-free correlationId generation.
  ```

#### PR #... (`feature/5-ticket-detail-attachments`)
- **Reviewer comment I received:**
  ```text
  1. [Issue] Identity on the new routes: app.ts:359, 469, 555, 617, 668 all read req.query.requesterId || req.headers["x-requester-id"], so parameter wins. On DELETE /api/attachments/:id it is destructive — a body of { "requesterId": <owner>, "reason": "..." } soft-removes anyone's attachment.
  2. [Issue] Type check vs AC-15: upload.ts filters on file.mimetype which the client sends. payload.exe declared image/png is accepted. Check extension against declared type.
  3. [Warning] Spec vs code: specification.md:259 says filenames are ${uuid}-${originalName} while code uses safe ${Date.now()}-${random}${ext}. Update spec to match code.
  4. [Warning] correlationId: routes are back to req-${Date.now()} instead of randomUUID().
  5. [Warning] Ownership shape: app.ts compares requesterId post-fetch rather than applying where predicate on query.
  ```
- **How I responded:**
  ```text
  Resolved all 5 items:
  1. Made req.headers["x-requester-id"] the authoritative identity across all 5 routes, overriding query/body parameters and preventing tenant spoofing. Added automated anti-spoofing tests for both GET /api/tickets/:id and DELETE /api/attachments/:id.
  2. Enhanced Multer fileFilter in upload.ts to validate both file extension (.jpg, .jpeg, .png, .webp, .pdf) and MIME type alignment, rejecting disguised files like trojan.exe with 415 UNSUPPORTED_MEDIA_TYPE.
  3. Updated docs/lab-02/specification.md section 11 to document the safe server-generated filename scheme without user input in filesystem paths.
  4. Standardized all routes and error handlers to use crypto.randomUUID() for collision-free correlationId generation.
  5. Migrated all 5 routes to strict SQL where predicates (where: { id, requesterId }) and relational filtering (ticket: { requesterId }), ensuring non-owned records are never read into memory, preceded by active-requester validation.
  ```

#### PR #22 (`feature/6-e2e-responsive-verification`)
- **Reviewer comment I received:**
  ```text
  Overview:
  | # | target | review |
  |---|---|---|
  | 1 | chained journeys and the worker config | pass |
  | 2 | three viewport projects, screenshots gated per project | pass |
  | 3 | page.route 500 with field preservation | pass |
  | 4 | removal reason checked from both sides of the boundary | pass |
  | 5 | real PNG magic bytes in the upload fixture | pass |
  | 6 | test 08 asserts 404 against a hard-coded ticket id | issue |
  | 7 | three screenshots do not show what 6 says they show | issue |
  | 8 | Navbar.tsx:31 changes mobile navigation | warning |
  | 9 | the suite writes to the development database | warning |
  | 10 | trace: "on-first-retry" with retries: 0 | warning |
  | 11 | STYLE-01.1 greps the CSS, STYLE-01.4 checks a class name | warning |
  | 12 | Zero Overflow ticked with nothing asserting it | warning |
  | 13 | year-locked regex, dead variable, fixed sleeps, six copies of the seed | warning |
  | 14 | tests.md items carried from #21 | warning |

  Items 6 and 7 block the merge.
  - Item 6: Test 08 asserts 404 against hard-coded ticket ID 126 instead of dynamically proving Sorawit's ticket exists (200 OK) before verifying cross-requester 404 when requested as Piti.
  - Item 7: Screenshots do not show what specification says:
    * 04-submitting-busy-state.png was identical to pre-submit form instead of showing disabled button & spinner.
    * 03-upload-attachment-modal.png showed empty initial state instead of upload modal with file selected.
    * 02-active-attachments-list.png was identical to initial detail view instead of showing active attachment list after upload.
    * 04-empty-state.png and 06-switch-requester-isolation.png were identical instead of distinct modal vs empty queue views.
  - Item 8: Navbar.tsx:31 adds text-nowrap on navigation tabs which alters mobile navigation wrapping behavior.
  - Item 10: trace: "on-first-retry" with retries: 0 means no traces are ever captured on failure.
  - Item 11: STYLE-01.1 greps the CSS file; STYLE-01.4 only checks class name instead of asserting min-height: 44px.
  - Item 12: Zero horizontal overflow claimed in checklist without automated assertion in E2E.
  - Item 13: Year-locked regex (2026), dead variables, fixed sleep timers, duplicate requester seeds.
  - Item 14: tests.md still describes API-12 as size-only rather than MIME/extension check; missing anti-spoofing tests.
  ```
- **How I responded:**
  ```text
  Resolved both blocking issues and addressed all warnings:
  1. Dynamic Ownership Isolation (Item 6): Refactored Test 08 to query Sorawit's tickets (GET /api/tickets), dynamically extract his created ticket ID, assert 200 OK under x-requester-id: 1, and then assert 404 Not Found (TICKET_NOT_FOUND) when requested as Piti (x-requester-id: 2).
  2. Authentic Spec Screenshots (Item 7):
     - 04-submitting-busy-state.png: Added route delay (800ms) to capture authentic disabled submit button and loading spinner during submission.
     - 03-upload-attachment-modal.png: Captured modal form with sample.png selected and file counter visible.
     - 02-active-attachments-list.png: Captured detail view after successful upload showing active attachment list, download button, and remove action.
     - 04-empty-state.png vs 06-switch-requester-isolation.png: Distinctly captured the switcher modal selection state and Piti's zero-ticket empty queue state.
  3. Mobile Navbar Polish (Item 8): Added text-nowrap on navigation tabs, hid department label on xs screens (d-none d-sm-inline), and updated docs/lab-02/ui-spec.md §2 with explicit mobile header layout rules.
  4. Playwright Trace Config (Item 10): Configured trace: "retain-on-failure" in playwright.config.ts so diagnostic traces are always captured on test failures.
  5. Touch Target Verification (Item 11): Enhanced client test STYLE-01.4 in ZenGreenStyle.test.tsx to parse CSS and assert min-height: 44px rule in addition to .touch-target class presence.
  6. Zero Overflow Assertion (Item 12): Added automated NFR-01 zero horizontal overflow check (document.body.scrollWidth <= window.innerWidth) across all tested viewports in Test 05.
  7. Dynamic Year & Clean Helpers (Item 13): Replaced hardcoded year with dynamic new RegExp(`^TKT-${new Date().getFullYear()}-\\d{6}$`), eliminated dead variables and fixed sleeps, and centralized requester context helpers.
  8. Test Plan & Anti-spoofing Docs (Item 14): Updated docs/lab-02/tests.md to document MIME/extension validation for API-12 and added API-16/API-17 anti-spoofing security tests.
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