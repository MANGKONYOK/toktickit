# Lab 3 — Peer Review Record

**Author:** Kittiphat Noikate - Student ID: 67070503459 - GitHub: @MANGKONYOK  
**Peer Reviewer:** Piti Srisongkram - Student ID: 67070503467 - GitHub: @kmood-Sakura  
**Target Integration Branch:** `lab3-staging`  
**Final Upstream Branch:** `main`

---

## Pull Requests I Authored (Reviewed by My Partner @kmood-Sakura)

| PR | Feature Branch | Target Branch | Scope / Feature Area | Reviewer Verdict |
| :---: | :--- | :--- | :--- | :--- |
| #1 | `lab3-feature/1-spec-andtest-plan` | `lab3-staging` | Sprint 3 Engineering Contract, RBAC Matrix, & Test Architecture | **Changes Addressed & Ready** |
| #2 | `lab3-feature/2-auth-foundation` | `lab3-staging` | Authentication Foundation, User Migration, Bcrypt Hashing, Session Management, and RBAC Middleware | **Changes Addressed & Ready** |
| #3 | `lab3-feature/3-requester-continuity` | `lab3-staging` | Requester Ticket Continuity, Session-Bound Ticket Operations, Ownership Boundary Isolation, Public Comments Stream, and Problem Resolved Indication | **Changes Addressed & Ready** |
| #4 | `lab3-feature/4-staff-ticket-queue` | `lab3-staging` | IT Staff Ticket Queue, Substring Search, Multi-Criteria Filtering, Ownership Filtering, Deterministic Sorting & Pagination | **Ready for Review** |

*(PR entries for subsequent features will be appended step-by-step as each feature branch is opened and reviewed).*

---

### Reviewer Comments Received & Responses

#### PR #1 (`lab3-feature/1-spec-andtest-plan`)

- **Reviewer comment I received:**

  ```text
  Read the diff, and checked your body's numbers against the files. Strong contract — the RBAC matrix is the best thing in it. One thing blocks; it is a find-replace.

  Good:
  - The RBAC matrix (specification.md:123) — 17 capabilities × 4 actors, and it separates 401 from 403 in every cell instead of collapsing both into "denied". 4.3 asks for exactly this.
  - Internal Notes are not distinguished by colour alone (ui-spec.md:121): amber, a border, a lock icon and a label. Colour is the last of four signals.
  - Every number in your body holds. 15 FR, 25 BR, 22 AC with no gaps, and all 32 JSON blocks in api-spec.md parse.

  Blocking:
  - Body says zero code altered, but all rows in tests.md read Final: Pass and specification.md:364 ticks every DoD box. Pass -> Planned, [x] -> [ ].

  Issue:
  - Six test tiers where §10 requires eight (missing security/authorization and migration/regression). Planned zero unit tests for BR-14 and BR-02.
  - AC-02 and AC-03 contradict: 403 ACCOUNT_INACTIVE acts as an enumeration oracle if checked before password.

  Worth fixing:
  - Migration is schema evolution, not additive.
  - Document initial-password strategy for migrated Lab 2 requesters.
  - itPriority should copy requester priority on creation.
  - 8.1 schema omits Attachment with retargeted foreign keys.
  ```

- **How I responded:**

  ```text
  Resolved all blocking and issue items systematically:
  1. Status alignment: Changed all test final statuses in tests.md to "Planned" and reset all Definition of Done checkboxes in specification.md to unchecked ([ ]), strictly preserving Part 2 Spec DD evidence.
  2. 8 Test tiers: Expanded test architecture in tests.md §1 to full 8 tiers (adding Security/Authorization and Migration/Regression). Planned pure unit tests UNIT-01 (password complexity) and UNIT-02 (8-state transition graph) and migration test MIG-01.
  3. Enumeration oracle: Updated BR-04 to mandate that email and bcrypt password matching executes prior to inspecting account active status. Invalid credentials always return 401, completely closing the enumeration oracle.
  4. Schema & migration polish: Added Attachment model in specification.md §8.1 with uploadedById and removedById retargeting to User, clarified itPriority copying on creation (BR-13), documented Lab 2 Requester migration strategy in §8.2, and characterized migration as schema evolution in §11.2.
  ```

#### PR #2 (`lab3-feature/2-auth-foundation`)

- **Author implementation notes:**
  - Evolved database schema from `RequesterUser` to `User`, adding `Role` enum, `Comment`, and `InternalNote` tables via migration `20260919114700_auth_foundation_and_user_model`.
  - Retargeted foreign keys on `Ticket` and `Attachment` without data loss or renaming original columns.
  - Implemented anti-enumeration defense ordering (verifying bcrypt password before inspecting active status, BR-04).
  - Built session cookie middleware (`requireAuth`, `requirePasswordChangeClear`, `requireRole`) and endpoints (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`).
  - Created client UI components (`Login.tsx`, `ChangePasswordModal.tsx`, `Navbar.tsx`, `AuthContext.tsx`).
  - Automated test coverage: 100% pass across all 14 Feature 2 tests (`UNIT-01`, `MIG-01`, `API-01..09`, `UI-01..03`) and 61 Lab 2 regression tests.

- **Reviewer comment received:**

  ```text
  Read both commits against lab3-staging, then checked your body's numbers against the files — 42 files, +2572 −111. Login and the migration are the best things here and I would change neither. Two rows block, both in code your tests only reach on the happy path.

  Good:
  - app.ts login — bcrypt before isActive, dummy compare on the unknown-email path.
  - migration.sql — User rows inserted preserving the original RequesterUser.id.
  - password-validator.ts and its 8 unit cases — BR-02 as a pure function.

  Blocking Issues:
  - Issue 4: Session identity is never verified. middleware/auth.ts:37 falls back to unsigned req.cookies, allowing forged cookie spoofing. Authorization: Bearer accepted unverified base64 payloads without cryptographic signature.
  - Issue 5: Lab 2 routes resolve ids against the wrong table. app.ts:162, 301, 396, 523, 616, 696, 784 resolve x-requester-id against prisma.requesterUser, but Ticket.requesterId points to User. If user/requester sequences drift, lookup fails or resolves to wrong user.

  Non-blocking Issues / Warnings:
  - Issue 6: Seed is not idempotent. seed.ts:209 overwrites passwordHash on update with default password; lines 207-208 overwrite isActive and mustChangePassword; line 226 deleteMany wipes non-Lab-2 users.
  - Issue 7: Cookie options should include secure: process.env.NODE_ENV === "production"; account count documentation should reflect 10 accounts (8 active, 2 inactive).
  - Issue 8: Documentation trails branch — specification.md:254 Attachment schema columns (fileName, fileSize, filePath) mismatch database schema.
  ```

- **How I responded:**

  ```text
  Resolved all peer review findings comprehensively:
  1. Cryptographic Session Verification (Issue 4):
     - Dropped unsigned `req.cookies` fallback in `server/src/middleware/auth.ts`, strictly requiring signed cookies (`req.signedCookies[SESSION_COOKIE_NAME]`).
     - Implemented `signBearerToken` and `verifyBearerToken` using HMAC-SHA256 keyed with `SESSION_SECRET`, using constant-time `crypto.timingSafeEqual` comparison to prevent timing attacks.
     - Added 3 automated security tests in `auth.api.test.ts` verifying that unsigned forged cookies and invalid Bearer signatures are rejected with 401 Unauthorized.
  2. Multi-Table Requester Resolution & Sequence Alignment (Issue 5):
     - Added `findActiveRequester` in `server/src/app.ts` resolving directly against `prisma.user` (where `Ticket.requesterId` points) so non-existent IDs 404 cleanly without foreign key mismatch.
     - Synchronized initial seed ordering in `server/prisma/seed.ts` so `User` and `RequesterUser` match 1:1 on IDs 1..5.
  3. True Seed Idempotency (Issue 6):
     - Updated `seed.ts` so that on `update`, `User.upsert` preserves `passwordHash`, `mustChangePassword`, and `isActive` intact.
     - Protected `Category` and `RelatedSystem` from overwriting `isActive` on existing rows.
     - Removed destructive `prisma.requesterUser.deleteMany()`.
  4. Cookie Flags & Account Count (Issue 7):
     - Added `secure: process.env.NODE_ENV === "production"` to `POST /api/auth/login` session cookie options.
     - Synchronized `specification.md` §8.3 to accurately document all 13 provisioned accounts (10 active, 3 inactive) including Lab 2 compatibility accounts.
  5. Schema Documentation Synchronization (Issue 8):
     - Updated `Attachment` model definition in `docs/lab-03/specification.md` §8.1 to match `schema.prisma` exactly (`fileName`, `fileSize`, `filePath`, `uploadedAt`, `removedAt`, `removalReason`).
  ```

#### PR #3 (`lab3-feature/3-requester-continuity`)

- **Author implementation notes:**
  - Enforced session identity precedence for ticket creation (`POST /api/tickets`), binding `requesterId` strictly to `req.user.id` and ignoring spoofed body/header values (AC-08).
  - Maintained complete backward compatibility with Lab 2 simulated requester context via `x-requester-id` / query fallback when unauthenticated.
  - Implemented multi-user ticket ownership isolation (`GET /api/tickets/:id`), returning HTTP 404 `TICKET_NOT_FOUND` to requesters attempting to view unowned tickets to prevent ID enumeration (AC-09).
  - Built Public Comments stream endpoints (`POST /api/tickets/:id/comments`, `GET /api/tickets/:id/comments`) allowing Requesters (for owned tickets) and Staff/Admin (for any ticket) to collaborate publicly (AC-10 / FR-06).
  - Built Requester Problem Resolved indication endpoint (`PATCH /api/tickets/:id/resolve-indication`) setting `resolvedByRequester = true` without altering operational status (BR-05 / AC-11).
  - Enhanced client UI: updated `TicketDetail.tsx` with live Public Discussion thread, comment posting form, and "✓ Problem Appears Resolved" toggle/badge; integrated `useAuth` into `CreateTicket.tsx` and `MyTickets.tsx`.
  - Added automated test suites: `server/tests/lab-03/tickets.api.test.ts` (7 tests), `server/tests/lab-03/comments-notes.api.test.ts` (8 tests), and `client/tests/lab-03/TicketComments.test.tsx` (4 tests).
  - Verification: 100% pass across all 103 server tests (88 baseline + 15 new) and 49 client tests (45 baseline + 4 new), preserving all 61 Lab 2 regression tests.

- **Reviewer comment received:**

  ```text
  Read be2409e against lab3-staging — 12 files, +1356 −99. The three new endpoints are the careful part of this branch and I would keep all of them. One row blocks, and it is the one your own test plan already flinched at.

  Good:
  - app.ts:442 — ownership is a SQL where predicate, not a post-fetch check, with staff and admin on their own branch.
  - app.ts:1120-1134 — resolve-indication writes only resolvedByRequester, leaves currentStatus alone and refuses CLOSED or CANCELLED with 400.
  - app.ts:1055 — the comment author select is id, fullName, role, and neither comments handler touches internalNote.

  Blocking Issues:
  - Issue 4: The ticket routes still accept x-requester-id when no session is present. Unauthenticated calls to POST /api/tickets, GET /api/tickets, GET /api/tickets/:id, POST /api/tickets/:id/attachments, GET /api/tickets/:id/attachments, DELETE /api/attachments/:id, and GET /api/attachments/:id/download must return 401 Unauthorized per FR-05 & BR-06. Ticket identity must strictly bind to req.user.id.

  Issues & Warnings:
  - Issue 5: AC-08 reads Pass while the row that proves it was deleted. In tests.md line 37, API-10 was merged onto the same line as API-09 without a newline, hiding API-10 from Table 2.
  - Warning 6: resolve-indication answers 404 where your matrix says 403. In specification.md:133, Indicate Problem Resolved is 403 for IT_STAFF and ADMIN, so role check must precede ticket ownership check.
  ```

- **How I responded:**

  ```text
  Resolved all peer review findings comprehensively:
  1. Strict Authentication & Deprecation of Legacy Headers (Issue 4):
     - Enforced `requireAuth, requirePasswordChangeClear` across all ticket and attachment routes (`POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/tickets/:id/attachments`, `DELETE /api/attachments/:id`, `GET /api/attachments/:id/download`).
     - Unauthenticated requests strictly return HTTP 401 Unauthorized (`UNAUTHORIZED`).
     - Completely eliminated `x-requester-id` and body/query `requesterId` identity fallbacks; ticket identity is strictly derived from authenticated session `req.user.id` (FR-05, BR-06).
     - Re-aligned Lab 2 test suites (`create-ticket`, `my-tickets`, `ticket-detail`, `attachments`) using cryptographic session tokens (`signBearerToken`) and added regression tests ensuring unauthenticated calls receive 401 and legacy headers cannot spoof identity.
  2. Table Formatting in tests.md (Issue 5):
     - Separated `API-09` and `API-10` into two distinct markdown table rows with proper newlines in `docs/lab-03/tests.md`, restoring Table 2 rendering and verifying AC-08.
  3. RBAC Matrix Alignment on Problem Resolution (Warning 6):
     - Updated `PATCH /api/tickets/:id/resolve-indication` in `server/src/app.ts` to perform role verification first: non-requesters (`IT_STAFF`, `ADMIN`) receive HTTP 403 Forbidden (`FORBIDDEN`), matching the capability matrix in `specification.md:133`. Ownership verification follows, returning 404 for unowned tickets.
     - Added automated tests in `server/tests/lab-03/tickets.api.test.ts` verifying 403 Forbidden for IT Staff and Admin callers.
  4. Verification:
     - 109/109 server tests passing across 16 test files (including all Lab 2 regression tests and Lab 3 auth/tickets/comments/notes suites).
     - 49/49 client tests passing across 12 test suites.
  ```

- **Reviewer comment received (Round 2 at `f6f26e1`):**

  ```text
  Re-read at f6f26e1 — the branch now stands at 16 files, +1624 −352. All three rows are closed and I checked each against the code rather than the commit message. Nothing blocks; one thing below is older than this PR and is yours to place.

  Good:
  - All three of the last round closed — six ticket routes gated, the API-10 row restored, the role check reordered.
  - app.ts:176 — a requester is bound at the query by where.requesterId = req.user!.id, and staff keep ?requesterId= as a filter rather than an identity.
  - The Lab 2 suite was adapted, not weakened — no case lost, attachments went 14 to 19, and the diff adds ten new 401/403 assertions.

  Issues & Warnings:
  - Issue 4: GET /api/requesters (app.ts:108) still answers without requireAuth and returns fullName, email and department for every active requester. Now that its five siblings all demand a session, this is the one door left open, handing out the directory to anyone who asks.
  - Warning 5: app.ts:142-143 rebuilds an x-requester-id header from req.user!.id so the Lab 2 query parser keeps its signature. Worth giving parseTicketQueryParams a requesterId argument and retiring the header for good.
  ```

- **How I responded (Round 2):**

  ```text
  Resolved both remaining review points:
  1. Directory Enumeration Protection on GET /api/requesters (Issue 4):
     - Added `requireAuth, requirePasswordChangeClear` to `GET /api/requesters` in `server/src/app.ts`, strictly closing the unauthenticated directory enumeration door.
     - Updated `client/src/api.ts` `fetchRequesters` to pass `{ credentials: "include" }`.
     - Updated `server/tests/lab-02/requesters.api.test.ts` to authenticate with `signBearerToken` and added a regression test verifying unauthenticated calls are rejected with 401 Unauthorized (`UNAUTHORIZED`).
  2. Retiring Synthesized x-requester-id Header (Warning 5):
     - Refactored `parseTicketQueryParams` in `server/src/utils/ticket-query.ts` to directly accept `requesterIdInput: number | Record<string, any>`, taking a numeric `effectiveRequesterId` as primary argument.
     - In `server/src/app.ts` `GET /api/tickets`, replaced header synthesis with direct passing of `effectiveRequesterId` to `parseTicketQueryParams`, retiring the synthesized `x-requester-id` header entirely.
  3. Verification:
     - 110/110 server tests passing across 16 test files (0 failures).
     - 49/49 client tests passing across 12 test suites (0 failures).
  ```

- **Reviewer comment received (Round 3 at `44901a5`):**

  ```text
  Re-read at 44901a5. Both rows are closed and the 401 test you added is the right one to have. One thing the same commit changed quietly, which I would rather you saw now than in Feature 4.

  Good:
  - app.ts:109 — /api/requesters gated, and requesters.api.test.ts now asserts 401 for an unauthenticated read.
  - app.ts:146 — parseTicketQueryParams takes a number, so the synthesised header is gone from the call path.

  Issues & Warnings:
  - Issue 3: app.ts:144 ends the staff branch with : req.user!.id, so a staff caller who passes no ?requesterId= resolves to their own id, and app.ts:179 then sets where.requesterId to it. Staff caller who passes no ?requesterId= returns a quietly wrong list — only tickets that staff member raised. : undefined and letting app.ts:179 fall through leaves the queue unfiltered.
  - Warning 4: ticket-query.ts:37 still accepts number | Record<string, any> and :46 still reads x-requester-id off that object. Narrow parameter to number and delete the object branch.
  ```

- **How I responded (Round 3):**

  ```text
  Resolved both review items cleanly:
  1. Staff Ticket List Fallthrough & Unfiltered Queue (Issue 3):
     - In `server/src/app.ts` `GET /api/tickets`, updated `effectiveRequesterId` fallback for non-requesters from `: req.user!.id` to `: undefined`.
     - When an IT Staff or Admin caller passes no `?requesterId=`, `effectiveRequesterId` is `undefined`, so `parseResult.params.requesterId` remains `undefined` and `where.requesterId` is omitted, leaving the queue unfiltered across all users as required for the staff view.
     - Added automated regression tests in `server/tests/lab-03/tickets.api.test.ts` verifying that IT Staff calling `GET /api/tickets` without `?requesterId=` receives tickets across all requesters, while passing `?requesterId=` filters to that requester.
  2. Strict Typing & Deletion of Legacy Header Branch in Query Parser (Warning 4):
     - In `server/src/utils/ticket-query.ts`, narrowed `requesterIdInput` type strictly to `number | undefined`.
     - Removed `Record<string, any>` and all `x-requester-id` reading logic completely from `ticket-query.ts`.
  3. Verification:
     - 112/112 server tests passing across 16 test files (0 failures).
     - 49/49 client tests passing across 12 test suites (0 failures).
  ```

#### PR #4 (`lab3-feature/4-staff-ticket-queue`)

- **Scope Implemented:**
  1. `GET /api/staff/tickets` API endpoint gated by `requireAuth`, `requirePasswordChangeClear`, and `requireRole(Role.IT_STAFF, Role.ADMIN)`.
  2. Substring search across `ticketNumber` and `summary` (case-insensitive).
  3. Multi-criteria filtering by `categoryId` / `categoryName`, `priority` (operational `itPriority`), and `status` across all 8 governed lifecycle statuses.
  4. Assignment filtering: `assigned=unassigned` (`ticketOwnerId is null`), `assigned=me` (`ticketOwnerId == req.user.id`), and `assigned=all`.
  5. Deterministic sorting (`createdAt`, `ticketNumber`, `summary`, `itPriority`, `status`, `updatedAt`) with secondary tie-breaker `id: "desc"` (BR-11).
  6. Server-side pagination with structured envelope matching `api-spec.md` §5.1.
  7. Responsive Zen Green `StaffTicketQueue.tsx` component with search/filter toolbar, sortable table, tablet scroll, mobile stacked cards, and pagination.
  8. Automated test suites:
     - `server/tests/lab-03/staff-queue.api.test.ts` (16 tests, covering API-15, API-16, API-17, AC-12, AC-13, AC-14).
     - `client/tests/lab-03/StaffTicketQueue.test.tsx` (10 tests, covering UI-05).
  9. Verification: 128/128 server tests passing across 17 files, 59/59 client tests passing across 13 files.

- **Reviewer comment I received:**

  ```text
  [Pending initial peer review from @kmood-Sakura]
  ```

- **How I responded:**

  ```text
  [To be updated upon peer review feedback]
  ```

---

## Pull Requests I Reviewed for My Partner (@kmood-Sakura)

**Partner Repository:** `https://github.com/kmood-Sakura/toktickit`

| PR / Feature | Branch | Target Branch | Review Scope | Reviewer Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Feature 1 | `lab3-feature/1-spec-andtest-plan` | `lab3-staging` | Sprint 3 Specification, RBAC Matrix & Test Plan | **Pending Partner PR** |

*(Reviews for partner's subsequent PRs will be logged incrementally as they are submitted).*

---

### Reviews Given to Partner (@kmood-Sakura)

#### Feature 1: Sprint 3 Engineering Contract (`lab3-feature/1-spec-andtest-plan`)

- **Review comments provided to partner:**

  ```text
  [To be populated upon review of partner's PR #1]
  ```

- **Partner's response & resolution:**

  ```text
  [To be recorded upon partner's resolution]
  ```