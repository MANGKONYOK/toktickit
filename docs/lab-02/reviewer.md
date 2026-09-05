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
| #22 | `feature/6-e2e-responsive-verification`| **Approved** |

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

#### PR #21 (`feature/5-ticket-detail-attachments`)
- **Reviewer comment I received:**
  ```text
  #### Overview

  | # | target | review |
  |---|---|---|
  | 1 | generated filenames | pass |
  | 2 | soft removal and its reason | pass |
  | 3 | 410 for a removed attachment | pass |
  | 4 | identity on the five new routes | issue |
  | 5 | attachment type check vs AC-15 | issue |
  | 6 | spec's filename scheme vs the code | warning |
  | 7 | correlationId in the new routes | warning |
  | 8 | ownership as a post-fetch check | warning |

  #### Detail

  ##### pass
  1. Filenames : upload.ts:29 stores ${Date.now()}-${random}${ext} and never puts originalname in the path, so there is nothing to traverse. path.extname on ../../evil.png returns .png.
  2. Soft removal : app.ts:706 updates rather than deletes, requires a 5–255 character reason, records removedById, and answers 409 when already removed. That is the whole rule, done.
  3. Removed download : app.ts:640 returns 410, distinct from the 404 for a missing one — the two really are different answers.

  ##### issue
  1. Identity on the new routes : app.ts:359, 469, 555, 617, 668 all read req.query.requesterId || req.headers["x-requester-id"], so the parameter wins. This is the precedence you fixed in ticket-query.ts:42 for #20; the five new routes did not pick it up. On DELETE /api/attachments/:id it is destructive — a body of { "requesterId": <owner>, "reason": "..." } soft-removes anyone's attachment. const raw = req.headers["x-requester-id"]; on all five.
  2. Type check vs AC-15 : your AC-15 rejects by extension (.exe, .zip), but upload.ts:41 filters on file.mimetype, which the client sends. payload.exe declared image/png is accepted and stored as .exe. Checking the extension against the declared type closes it.

  ##### warning
  1. Spec vs code : specification.md:259 says filenames are ${uuid}-${originalName}, and the code does not do that. The code is the safer of the two — originalName is user input — so this is the spec to correct, not the implementation.
  2. correlationId : app.ts:614, 665 are back to req-${Date.now()}, after :110 moved to randomUUID() in #20. Two new sites rather than a decision, I think.
  3. Ownership shape : app.ts:626 loads the ticket with include: { ticket: true } and compares requesterId afterwards. The answer is right; a where on the query would mean the row is never read when it is not yours.

  Item 1 is the one I would fix first — it is the same root cause as #18, #19 and #20, and this is the first place where getting it wrong destroys data rather than exposing it.
  ```
- **How I responded:**
  ```text
  Resolved all issues and addressed warnings systematically:
  1. Made req.headers["x-requester-id"] the authoritative identity across all 5 routes, overriding query/body parameters and preventing tenant spoofing. Added automated anti-spoofing tests for both GET /api/tickets/:id and DELETE /api/attachments/:id.
  2. Enhanced Multer fileFilter in upload.ts to validate both file extension (.jpg, .jpeg, .png, .webp, .pdf) and MIME type alignment, rejecting disguised files like trojan.exe with 415 UNSUPPORTED_MEDIA_TYPE.
  3. Updated docs/lab-02/specification.md section 11 to document the safe server-generated filename scheme without user input in filesystem paths.
  4. Standardized all routes and error handlers to use crypto.randomUUID() for collision-free correlationId generation in both logs and error bodies.
  5. Migrated all 5 routes to strict SQL where predicates (where: { id, requesterId }) and relational filtering (ticket: { requesterId }), ensuring non-owned records are never read into memory, preceded by active-requester validation.
  ```
- **Reviewer Approval Received:**
  ```text
  #### Overview

  | # | target | review |
  |---|---|---|
  | 4 | identity precedence on the five new routes | pass |
  | 5 | type check vs AC-15 | pass |
  | 6 | spec's filename scheme | pass |
  | 7 | correlationId in the new routes | pass |
  | 8 | ownership as a where predicate | pass |
  | 9 | download URL cannot carry the header | warning |
  | 10 | 11.4 and api-spec.md still describe the old identity model | warning |
  | 11 | both checks trust the declared type | warning |
  | 12 | tests.md not updated for the two new tests | warning |
  | 13 | ALLOWED_EXTENSIONS and MIME_BY_EXT duplicate one list | warning |
  | 14 | empty header handled two ways | warning |

  Pass details:
  1. Identity precedence: app.ts:360, 484, 585, 665, 738 all read req.headers["x-requester-id"] ?? req.query.requesterId now.
  2. Type check: upload.ts:58 rejects any extension outside the five, then :68 cross-checks it against declared MIME.
  3. Spec filename: specification.md:259 documents the generated scheme.
  4. correlationId: randomUUID() on all five routes and error middleware.
  5. Ownership: app.ts:392, 519, 611 filter on { id, requesterId }, and :693, 781 reach through the relation with ticket: { requesterId: requester.id }.
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
- **Reviewer Approval Received:**
  ```text
  Good turnaround. In both blockers you fixed the cause rather than the symptom — the delay-then-capture and the dynamic ticket lookup are the versions I would have written.
  ```

---

## Pull Requests I Reviewed for My Partner (@kmood-Sakura)

| PR / Feature | Branch | Reviewer Verdict |
| :--- | :--- | :--- |
| PR #10 (Feature 1) | `lab2-feature/1-sprint-contract` | **Approved & Merged** |
| PR #11 (Feature 2) | `lab2-feature/2-data-model-context` | **Approved & Merged** |
| PR #16 / #17 (Feature 3) | `lab2-feature/3-create-ticket-attachment` | **Approved & Merged** |
| PR #18 (Feature 4-6 Release) | `lab2-feature/4-list-detail-release` | **Changes Requested / In Progress** |

### Comments Left & Partner's Responses

#### PR #10 (`lab2-feature/1-sprint-contract` — Feature 1: Specification & Engineering Contract)
- **My comment:**
  ```text
  Commendations:
  - Impressive coverage of all 11 specification sections, 27 FRs, 48 BRs, and 36 Given-When-Then ACs mapped to a 6-level test plan (109 planned tests).
  - Strong decision to enforce ownership at the database query level with WHERE predicates and return HTTP 404 Not Found (rather than 403) to avoid disclosing ticket existence.
  - Detailed design tokens, accessible states (aria-readonly, aria-busy), and responsive card/table layouts.

  Action Items & Technical Adjustments to Address:
  1. Add Complete schema.prisma Code Block in specification.md:
     Section 7 currently describes models via ASCII text. Adding an explicit schema.prisma code block (model Requester, Ticket, Attachment, AttachmentBlob, relations, indexes) ensures single-source-of-truth field naming (removedReason vs removalReason, sizeBytes vs fileSize, fullName vs name) before implementation starts.
  2. Add URGENT to Priority Enum (System SDS D-03 Alignment):
     The System-Level SDS (D-03) defines 4 priority levels: LOW, MEDIUM, HIGH, URGENT. Current spec only defines Priority { LOW, MEDIUM, HIGH }. Please add URGENT to the Prisma enum, API validation, and UI badges.
  3. Support requesterId in Body/Query as Fallback (BR-08):
     Keeping X-Requester-Id header authoritative is great for Lab 3 middleware migration. However, consider accepting requesterId in JSON bodies (POST /api/tickets) and query parameters (GET /api/tickets?requesterId=...) when the header is absent so external test runners don't break with unexpected 400s.
  4. Lower Description Minimum Length (BR-16):
     Current rule requires 20–4000 characters. Real-world valid issues like "VPN is down." (12 chars) or "Cannot log in." (14 chars) would be rejected. Consider lowering the minimum bound to 10 characters.
  5. Relax pageSize Validation (BR-30, A-09):
     Strictly returning 400 Bad Request for any pageSize other than 10, 20, 50 is overly restrictive. Consider accepting a capped numeric range (1..100) or defaulting invalid values to 10 instead of rejecting.
  6. Prisma Query Strategy for AttachmentBlob:
     Ensure that future ticket list and detail queries explicitly omit the blob table (AttachmentBlob) so that metadata queries remain fast and do not load 5MB payloads into server memory unnecessarily.
  7. Cross-Document Rule Reconcile:
     Ensure rule IDs and parameter names (sort/order vs sortBy/sortOrder, pageSize vs limit) are uniformly referenced across specification.md, api-spec.md, and tests.md.
  ```
- **Partner's response:**
  ```text
  Thank you — this is a substantive review, and four of the seven items change the contract:
  Accepted:
  1. Explicit schema.prisma block in §7: Agreed, the canonical names are removedReason, sizeBytes and fullName. The block lands on this branch before merge.
  6. Blob exclusion must be enforced, not intended: Agreed, the 1:1 split into AttachmentBlob only pays for itself if nothing joins across it. Added BR-49 and API-53 to assert queries never select the blob table without explicit request.
  7. Cross-document parameter naming: Verified identical across api-spec.md, specification.md, and tests.md (sort, order, page, pageSize).
  2. URGENT in priority enum: Cited against System-Level SDS D-03; enum, specification.md, api-spec.md and ui-spec.md badge updated.

  Held, with reasons:
  3. requesterId fallback: Holding strict X-Requester-Id header authority to avoid two sources of truth for identity, but enhanced 400 error body to name header explicitly: { "error": "Missing or invalid X-Requester-Id header.", "field": "X-Requester-Id" }.
  4. Description minimum of 20: Summary has minimum 5 (BR-15); Description has minimum 20 (BR-16) to ensure meaningful problem detail beyond summary copy.
  5. pageSize allow-list: Kept strict allow-list (10, 20, 50) per labsheet §6.1 requirement to document permitted page sizes and invalid-parameter rejection.
  ```

#### PR #11 (`lab2-feature/2-data-model-context` — Feature 2: Data Model, Seed & Requester Context)
- **My comment:**
  ```text
  Commendations:
  - Strictly Idempotent Seed: Using update: {} with upsert guarantees safe re-runs without silently reactivating deactivated rows (proven by SEED-01 in seed-idempotency.api.test.ts).
  - Clean Middleware Architecture: requesterContext.ts cleanly isolates simulated identity, returning 400 for missing headers and 403 for inactive/unknown requesters.
  - Client Reconciliation: Persisting only Requester ID in localStorage and resolving against the live API on load prevents stale identity bugs.
  - Test Infrastructure: Fixed @testing-library/jest-dom/vitest imports in tests/setup.ts so tsc --noEmit runs clean.

  Changes Requested (1 blocker + minor fixes):
  1. [Blocker] Missing Endpoint: GET /api/related-systems:
     While RelatedSystem model and seed data are ready, the route GET /api/related-systems was omitted from app.ts and reference-data.api.test.ts. Feature 3 requires this endpoint.
  2. Missing URGENT in Priority Enum:
     server/prisma/schema.prisma: enum Priority currently only includes LOW, MEDIUM, HIGH. Please include URGENT per System SDS D-03 before Feature 3 uses it.
  3. apiFetch Header Spreading Issue:
     client/src/api.ts:65-70 spreads headers: { ...authHeaders(), ...(init.headers ?? {}) }. If init.headers is a Headers instance, spreading evaluates to {} and drops X-Requester-Id.
  4. Selection State Initialization in RequesterSelect.tsx:
     const [chosen, setChosen] = useState<string>("") always resets to "Choose a requester…" even when opening the screen via "Change Requester".
  ```
- **Partner's response:**
  ```text
  Overview:
  | # | category | header | status |
  |---|---|---|---|
  | 1 | issue | missing GET /api/related-systems | complete |
  | 2 | issue | missing URGENT in the Priority enum | complete |
  | 3 | warning | apiFetch drops a Headers instance | complete |
  | 4 | warning | selection state initialisation in RequesterSelect.tsx | complete |

  All four taken. Server 16 tests, client 12, both type checks clean.
  1. Missing GET /api/related-systems: Added active-only and name-ordered route with API-03 tests.
  2. Missing URGENT in Priority enum: Added migration ALTER TYPE "Priority" ADD VALUE 'URGENT'; updated specification.md, api-spec.md, and ui-spec.md badge.
  3. apiFetch drops a Headers instance: Replaced object spread with new Headers(init.headers) to properly preserve caller headers while injecting X-Requester-Id.
  4. Selection state initialisation: Seeded chosen from live selection state so active requester is pre-selected upon navigation.
  Verification: Server 5 files, 16 tests passing; Client 2 files, 12 tests passing; TypeScript checks clean.
  ```

#### PR #16 & #17 (`lab2-feature/3-create-ticket-attachment` — Feature 3: Create Ticket & Attachments)
- **My comment:**
  ```text
  Commendations & Strengths:
  - Clean Partial Success Workflow (BR-43): Separating ticket creation from attachment upload ensures that a rejected or invalid file never rolls back the user's created ticket. Reporting failed files on the success banner matches the specification perfectly.
  - Robust Concurrency & Idempotency (BR-10, BR-20): Atomic row-locked TicketSequence via UPDATE ... RETURNING inside the transaction guarantees zero ticket collision, and two-stage idempotency handling is very solid.
  - Comprehensive Upload Validation (BR-33, BR-34, BR-42): Pure attachment validator enforcing extension agreement with declared MIME types, size bounds, and memory storage.
  - Thorough Testing: Integration tests for concurrent sequence creation, idempotency replay, and Multer 413 error handling are well-constructed.

  Feedback & Action Items:
  1. SPA Navigation on Success Screen:
     <a className="btn zen-btn-primary mt-3" href="/tickets"> causes full page hard reload. Use <Link to="/tickets"> from react-router-dom to preserve client SPA state.
  2. Accessibility Wiring for Form Errors (STYLE-05 / AC-34):
     client/src/components/FormField.tsx & CreateTicket.tsx: While error IDs are generated (${id}-error), input controls do not receive aria-invalid={Boolean(fieldErrors[id])} and aria-describedby={fieldErrors[id] ? `${id}-error` : undefined}.
  3. Network Error Guard during Attachment Upload Loop:
     client/src/api.ts:158: If uploadAttachment encounters a network failure (fetch rejection), it throws and escapes the loop into submit catch block, telling the user ticket creation failed when it was already committed to DB. Wrap apiFetch with try/catch returning { ok: false, message: "Network error during upload" } to ensure Ticket Number is displayed.
  4. Catch-all 500 JSON Handler (BR-45):
     Add catch-all 500 JSON handler after SyntaxError check so unhandled runtime errors return { error: "Internal server error" } instead of Express default HTML stack trace.
  ```
- **Partner's response:**
  ```text
  Overview:
  | # | category | header | status |
  |---|---|---|---|
  | 1 | warning | SPA navigation on the success screen | complete |
  | 2 | issue | accessibility wiring for form errors | complete |
  | 3 | issue | network error guard in the upload loop | complete |
  | 4 | warning | catch-all 500 JSON handler | complete |

  All four taken:
  1. SPA navigation: Replaced <a href> with <Link to="/tickets">.
  2. Accessibility wiring: Refactored FormField children into render props so input controls receive aria-invalid and aria-describedby directly.
  3. Network error guard: Wrapped upload loop with error guard so network drops during upload preserve created ticket number display (BR-43).
  4. Catch-all 500 handler: Added global JSON error handler returning safe 500 envelope.
  Verification: Two regression tests added: aria-describedby element resolution and Ticket Number display on network failure. Approved and merged via PR #17.
  ```

#### PR #18 (`lab2-feature/4-list-detail-release` — Features 4, 5 & 6: My Tickets, Ticket Detail, & Responsive Release)
- **My comment:**
  ```text
  Commendations:
  - Overall, exceptionally high-quality PR. The architecture around database-level data isolation (where: { requesterId }), deterministic secondary key ordering (id: desc), and the complete isolation of AttachmentBlob queries (BR-49) is rock solid.

  Issues to Address:
  1. Missing Column Sorting UI & Date Columns on MyTickets (client/src/pages/MyTickets.tsx:104-112, 33-35):
     - Table headers are static <th> elements without interactive <button> toggles or aria-sort.
     - Created and Updated columns are omitted from desktop table.
     - filters.sort is hardcoded to "createdAt" / "desc", preventing users from exercising backend sort feature (ticketNumber, updatedAt, asc/desc).
  2. Missing Attachment Upload on RequesterTicketDetail (client/src/pages/RequesterTicketDetail.tsx:127-186):
     - Backend implements POST /api/tickets/:id/attachments (FR-13), and BR-43 notes rejected files can be added later from Ticket Detail.
     - RequesterTicketDetail currently only displays existing attachments and removal; lacks file picker to upload attachments to an existing ticket.
  3. attachmentCount Inconsistency in ticketView (server/src/routes/tickets.ts:36):
     - In GET /api/tickets (line 160), _count correctly excludes soft-removed attachments via _count: { select: { attachments: { where: { removedAt: null } } } }, but detail view returns total count without filtering removed rows.
  ```
- **Partner's response:**
  ```text
  Acknowledged review findings:
  1. Column sorting & dates: Implemented interactive sortable headers with aria-sort, active sort direction chevron indicators, and added Created/Updated timestamp columns to My Tickets table.
  2. Ticket detail attachment upload: Added file picker input with 5MB/extension validation and upload submission button to RequesterTicketDetail.
  3. Attachment count consistency: Harmonized list and detail queries so attachmentCount strictly reflects unremoved active attachments.
  ```