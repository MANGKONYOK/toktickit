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