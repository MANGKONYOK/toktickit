# Lab 2 Test Plan and Results

## 1. Test Strategy
Sprint 2 enforces strict Spec-Driven Development (Spec DD) and Test-Driven Development (TDD). The test plan covers six distinct levels of automated verification:

1. **Unit Testing:** Validates pure domain logic, input validators, string sanitizers and the unique Ticket Number generator (`TKT-YYYY-NNNNNN`) in isolation.
2. **API / Integration Testing:** Validates Express endpoints with Supertest against PostgreSQL, enforcing input validation schemas, cross-requester ownership isolation, search/filter/sorting logic, pagination metadata, file upload limits, and attachment soft-removal.
3. **UI Component Testing:** Validates React component render tree, interactive form state transitions, inline field-level validation message placements, button busy/loading indicators and confirmation dialogs using Vitest and React Testing Library.
4. **UI Style Testing:** Validates Zen Green design system conformance, asserting exact CSS classes and color tokens (Primary `#006B3C`, Secondary `#0B7A46`, Pale Green `#EAF6EF`, Read-only `#F0F4F1`, Error `#C5221F`), distinct read-only field shading, and required asterisks.
5. **Responsive Testing:** Validates viewport layout behavior across Desktop ($\ge 992\text{px}$), Tablet ($768\text{px}-991\text{px}$), and Mobile ($< 768\text{px}$) with zero horizontal scrolling and touch targets $\ge 44\text{px}$.
6. **E2E Testing:** Validates complete user journeys in Playwright (`e2e/lab-02/requester-ticket-flow.spec.ts`), testing multi-user selection, ticket creation, list filtering/sorting, detail inspection and attachment upload/soft-removal across viewports.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **UNIT-01** | Unit | AC-01, BR-01 | Ticket Number format and sequential generation | Returns format `TKT-YYYY-NNNNNN` with 6-digit sequence | `server/tests/lab-02/ticket-number.test.ts` | **PASS** |
| **UNIT-02** | Unit | AC-05, BR-05 | Input validation helper (Summary & Description lengths) | Rejects strings outside 5-100 and 10-2000 bounds | `server/tests/lab-02/validation.test.ts` | **PASS** |
| **API-01** | API | AC-01, FR-04 | Create valid ticket with required fields | `201 Created`; ticket created with format `TKT-YYYY-NNNNNN` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-02** | API | AC-05, BR-05 | Reject ticket creation with missing/invalid summary | `400 Bad Request` with field validation details | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-03** | API | AC-05, BR-05 | Reject ticket creation with invalid category/system | `404 Not Found` for invalid reference foreign key | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-04** | API | AC-02, FR-01 | Retrieve active requesters list | `200 OK`; returns 4 active users; excludes inactive | `server/tests/lab-02/requesters.api.test.ts` | **PASS** |
| **API-05** | API | AC-04, FR-03 | Retrieve reference data (Categories & Systems) | `200 OK`; returns 4 categories and 7 related systems | `server/tests/lab-02/reference-data.api.test.ts` | **PASS** |
| **API-06** | API | AC-07, AC-08 | Query tickets with search, category/priority/status filters | `200 OK`; returns filtered subset with pagination meta | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-07** | API | AC-09, AC-10 | Query tickets with custom sorting and pagination | `200 OK`; returns ordered results with correct page/limit | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-08** | API | AC-03, FR-06 | Multi-user isolation: query tickets of another requester | `200 OK`; only tickets owned by query requesterId returned | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-09** | API | AC-13, FR-10 | Retrieve owned ticket detail with attachments | `200 OK`; returns ticket header and attachment list | `server/tests/lab-02/ticket-detail.api.test.ts` | **PASS** |
| **API-10** | API | AC-03, FR-06 | Unauthorized access: get ticket of another requester | `404 Not Found`; resource not leaked to other users | `server/tests/lab-02/ticket-detail.api.test.ts` | **PASS** |
| **API-12** | API | AC-15, BR-09 | Reject oversized attachment (>5MB) or invalid MIME/extension mismatch | `413 Payload Too Large` / `415 Unsupported Media` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-13** | API | AC-16, BR-10 | Reject 6th active attachment upload | `409 Conflict`; maximum 5 active limit reached | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-14** | API | AC-17, BR-11 | Soft-remove attachment with valid reason | `200 OK`; `removedAt` set, metadata retained | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-15** | API | AC-18, BR-12 | Block download for soft-removed attachment | `404 Not Found` / `410 Gone`; download rejected | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-16** | API | AC-03, FR-06 | Header identity anti-spoofing on list & detail routes | Headers override body/query parameters; 404 on unowned resource | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-17** | API | AC-03, BR-11 | Header identity anti-spoofing on attachment soft-removal | Rejects attempt to remove another user's attachment via body spoofing | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **UI-01** | UI | AC-02, FR-01 | Render Requester Selector when no context selected | Selector dropdown displayed with active users | `client/tests/lab-02/RequesterSelector.test.tsx` | **PASS** |
| **UI-02** | UI | AC-05, BR-05 | Show inline field validation errors on empty submit | Red error messages displayed below invalid inputs | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-03** | UI | AC-01, BR-14 | Submit button displays busy state during async call | Button disabled with loading spinner | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-04** | UI | AC-06, BR-07 | Preserve form field values when API submission fails | Inputs retained, error notification shown | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-05** | UI | AC-11, FR-09 | Display empty state vs no-results search filter state | Distinct empty state callouts rendered | `client/tests/lab-02/MyTickets.test.tsx` | **PASS** |
| **UI-06** | UI | AC-13, FR-10 | Ticket detail renders all header fields as read-only | Shaded background `#F0F4F1`, inputs non-editable | `client/tests/lab-02/TicketDetail.test.tsx` | **PASS** |
| **UI-07** | UI | AC-17, BR-11 | Soft removal modal prompts for removal reason | Reason textarea required before confirm enabled | `client/tests/lab-02/AttachmentSection.test.tsx` | **PASS** |
| **STYLE-01**| Style | AC-13, NFR-02 | Assert Zen Green color tokens and read-only styling | `#006B3C`, `#0B7A46`, `#F0F4F1` applied correctly | `client/tests/lab-02/ZenGreenStyle.test.tsx` | **PASS** |
| **RESP-01** | Responsive | NFR-01 | Multi-viewport responsive checks (Desktop, Tablet, Mobile) | Form stacks vertically on mobile, zero overflow-x | `client/tests/lab-02/ResponsiveLayout.test.tsx` | **PASS** |
| **E2E-01** | E2E | AC-01..18 | Full Requester journey: create, list, filter, detail, attachments | All actions complete across Desktop/Tablet/Mobile | `e2e/lab-02/requester-ticket-flow.spec.ts` | **PASS** |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Verification Level | Covered By Tests |
| :--- | :--- | :--- |
| **AC-01** (Ticket Creation Success) | Unit / API / UI / E2E | `UNIT-01`, `API-01`, `UI-03`, `E2E-01` |
| **AC-02** (Requester Context Gate) | API / UI / E2E | `API-04`, `UI-01`, `E2E-01` |
| **AC-03** (Ownership Isolation) | API / E2E | `API-08`, `API-10`, `E2E-01` |
| **AC-04** (Reference Data Load) | API / UI | `API-05`, `E2E-01` |
| **AC-05** (Field Validation Feedback) | Unit / API / UI / E2E | `UNIT-02`, `API-02`, `API-03`, `UI-02`, `E2E-01` |
| **AC-06** (Form Data Preservation) | UI / E2E | `UI-04`, `E2E-01` |
| **AC-07** (Ticket Search) | API / E2E | `API-06`, `E2E-01` |
| **AC-08** (Multi-Filter Combination) | API / E2E | `API-06`, `E2E-01` |
| **AC-09** (Sorting Consistency) | API / E2E | `API-07`, `E2E-01` |
| **AC-10** (Pagination Mechanics) | API / E2E | `API-07`, `E2E-01` |
| **AC-11** (Empty vs No-Results State) | UI / E2E | `UI-05`, `E2E-01` |
| **AC-12** (Switch Requester Context) | UI / E2E | `UI-01`, `E2E-01` |
| **AC-13** (Read-Only Ticket Detail) | API / UI / Style / E2E | `API-09`, `UI-06`, `STYLE-01`, `E2E-01` |
| **AC-14** (Valid Attachment Upload) | API / E2E | `API-11`, `E2E-01` |
| **AC-15** (Reject Invalid Attachment) | API / E2E | `API-12`, `E2E-01` |
| **AC-16** (Enforce 5 Attachments Limit)| API / E2E | `API-13`, `E2E-01` |
| **AC-17** (Soft Removal with Reason) | API / UI / E2E | `API-14`, `UI-07`, `E2E-01` |
| **AC-18** (Blocked Removed Download) | API / E2E | `API-15`, `E2E-01` |

---

## 4. Responsive and Visual Checklist
- [x] Desktop Viewport ($\ge 992\text{px}$): Multi-column grid, max-width 1200px container, full table view.
- [x] Tablet Viewport ($768\text{px}-991\text{px}$): 2-column form layout, compact/scrollable table.
- [x] Mobile Viewport ($< 768\text{px}$): Single-column stacked layout, ticket cards, touch targets $\ge 44\text{px}$, zero horizontal scrolling.

---

## 5. Test Commands

```powershell
# 1. Run all Backend API & Unit Tests
cd server; npm test

# 2. Run all Frontend Component & UI Style Tests
cd client; npm test

# 3. Run End-to-End Playwright Tests
npx playwright test
```

---

## 6. Final Results

### Feature 2 Test Results (Verified)
```text
=== Backend Tests (Vitest) ===
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-02/requesters.api.test.ts (2 tests)
 ✓ tests/lab-02/reference-data.api.test.ts (2 tests)

 Test Files  4 passed (4)
      Tests  6 passed (6)

=== Frontend Tests (Vitest & Testing Library) ===
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/RequesterSelector.test.tsx (4 tests)

 Test Files  2 passed (2)
      Tests  7 passed (7)
```

### Feature 3 Test Results (Verified)
```text
=== Backend Tests (Vitest & Supertest) ===
 ✓ tests/lab-02/ticket-number.test.ts (2 tests) [UNIT-01 / AC-01, BR-01]
 ✓ tests/lab-02/validation.test.ts (8 tests) [UNIT-02 / AC-05, BR-05, BR-06]
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-02/requesters.api.test.ts (2 tests) [API-04 / AC-02, BR-04]
 ✓ tests/lab-02/reference-data.api.test.ts (2 tests) [API-05 / AC-04]
 ✓ tests/lab-02/create-ticket.api.test.ts (7 tests) [API-01, API-02, API-03 / AC-01, AC-05, BR-01, BR-02, BR-04, BR-05]

 Test Files  7 passed (7)
      Tests  23 passed (23)

=== Frontend Tests (Vitest & Testing Library) ===
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/RequesterSelector.test.tsx (4 tests) [UI-01 / AC-02, BR-03, BR-04]
 ✓ tests/lab-02/CreateTicket.test.tsx (5 tests) [UI-02, UI-03, UI-04 / AC-01, AC-05, AC-06, BR-05, BR-06, BR-07, BR-14, UI Spec §4.3]

 Test Files  3 passed (3)
      Tests  12 passed (12)
```

### Feature 4 Test Results (Verified)
```text
=== Backend Tests (Vitest & Supertest) ===
 ✓ tests/lab-02/validation.test.ts (8 tests) [UNIT-02 / AC-05, BR-05, BR-06]
 ✓ tests/lab-02/ticket-number.test.ts (2 tests) [UNIT-01 / AC-01, BR-01]
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-02/requesters.api.test.ts (2 tests) [API-04 / AC-02, BR-04]
 ✓ tests/lab-02/reference-data.api.test.ts (2 tests) [API-05 / AC-04]
 ✓ tests/lab-02/create-ticket.api.test.ts (7 tests) [API-01, API-02, API-03 / AC-01, AC-05, BR-01, BR-02, BR-04, BR-05]
 ✓ tests/lab-02/my-tickets.api.test.ts (16 tests) [API-06, API-07, API-08 / AC-03, AC-07, AC-08, AC-09, AC-10, FR-06, FR-07, FR-08]

 Test Files  8 passed (8)
      Tests  39 passed (39)

=== Frontend Tests (Vitest & Testing Library) ===
 ✓ tests/lab-02/ResponsiveLayout.test.tsx (2 tests) [RESP-01 / NFR-01, style-contract.md]
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/MyTickets.test.tsx (5 tests) [UI-05 / AC-07, AC-08, AC-09, AC-10, AC-11, FR-07, FR-08, FR-09]
 ✓ tests/lab-02/RequesterSelector.test.tsx (4 tests) [UI-01 / AC-02, BR-03, BR-04]
 ✓ tests/lab-02/CreateTicket.test.tsx (5 tests) [UI-02, UI-03, UI-04 / AC-01, AC-05, AC-06, BR-05, BR-06, BR-07, BR-14, UI Spec §4.3]

 Test Files  5 passed (5)
      Tests  19 passed (19)
```

### Feature 5 Test Results (Verified)
```text
=== Backend Tests (Vitest & Supertest) ===
 ✓ tests/lab-02/ticket-number.test.ts (2 tests) [UNIT-01 / AC-01, BR-01]
 ✓ tests/lab-02/validation.test.ts (8 tests) [UNIT-02 / AC-05, BR-05, BR-06]
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-02/reference-data.api.test.ts (2 tests) [API-05 / AC-04]
 ✓ tests/lab-02/requesters.api.test.ts (2 tests) [API-04 / AC-02, BR-04]
 ✓ tests/lab-02/create-ticket.api.test.ts (7 tests) [API-01, API-02, API-03 / AC-01, AC-05, BR-01, BR-02, BR-04, BR-05]
 ✓ tests/lab-02/ticket-detail.api.test.ts (6 tests) [API-09, API-10 / AC-03, AC-13, FR-10]
 ✓ tests/lab-02/my-tickets.api.test.ts (18 tests) [API-06, API-07, API-08 / AC-03, AC-07, AC-08, AC-09, AC-10, FR-06, FR-07, FR-08]
 ✓ tests/lab-02/attachments.api.test.ts (14 tests) [API-11..15 / AC-14..18, BR-08..12]

 Test Files  10 passed (10)
      Tests  61 passed (61)

=== Frontend Tests (Vitest & Testing Library) ===
 ✓ tests/lab-02/ResponsiveLayout.test.tsx (2 tests) [RESP-01 / NFR-01]
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/TicketDetail.test.tsx (3 tests) [UI-06 / AC-13, FR-10]
 ✓ tests/lab-02/MyTickets.test.tsx (5 tests) [UI-05 / AC-07, AC-08, AC-09, AC-10, AC-11, FR-07, FR-08, FR-09]
 ✓ tests/lab-02/RequesterSelector.test.tsx (4 tests) [UI-01 / AC-02, BR-03, BR-04]
 ✓ tests/lab-02/CreateTicket.test.tsx (5 tests) [UI-02, UI-03, UI-04 / AC-01, AC-05, AC-06, BR-05, BR-06, BR-07, BR-14, UI Spec §4.3]
 ✓ tests/lab-02/AttachmentSection.test.tsx (5 tests) [UI-07 / AC-14..18, BR-09..12]

 Test Files  7 passed (7)
      Tests  27 passed (27)
```

### Feature 6 Test Results (Verified)
```text
=== Zen Green Design System Conformance (Vitest & Testing Library) ===
 ✓ tests/lab-02/ZenGreenStyle.test.tsx (4 tests) [STYLE-01 / AC-13, NFR-02, UI Spec §3]
   - STYLE-01.1: verifies exact Zen Green color palette tokens (#006B3C, #0B7A46, #EAF6EF, #F0F4F1, #C5221F, #F5F7F6)
   - STYLE-01.2: asserts mandatory form inputs display visible red asterisks (*)
   - STYLE-01.3: asserts Ticket Detail surface strictly uses read-only background and styling
   - STYLE-01.4: asserts primary and secondary buttons follow Zen Green hierarchy with touch targets >= 44px

=== Frontend Test Suite Summary (Vitest & Testing Library) ===
 Test Files  8 passed (8)
      Tests  31 passed (31)

=== Playwright End-to-End Test Matrix (Cross-Browser / Multi-Viewport) ===
 Running 24 tests using 1 worker across 3 projects (desktop, tablet, mobile)

  ok  1 [desktop] › 01. Requester Context & Development Selector (AC-02, AC-12, UI Spec §4.1)
  ok  2 [desktop] › 02. Create Ticket Form Initial State & Validation Errors (AC-04, AC-05, BR-05, BR-06)
  ok  3 [desktop] › 03. Form Data Preservation on API Failure (AC-06, BR-07)
  ok  4 [desktop] › 04. Successful Ticket Creation & Busy State (AC-01, BR-01..04)
  ok  5 [desktop] › 05. My Tickets: Table View, Mobile View, Search, and Filtering (AC-07..11, NFR-01)
  ok  6 [desktop] › 06. Requester Switching and Multi-User Isolation (AC-03, AC-11 State A, AC-12)
  ok  7 [desktop] › 07. Ticket Detail Read-Only View & Attachment Lifecycle (AC-13..18, FR-10)
  ok  8 [desktop] › 08. Cross-Requester Security 404 Verification (AC-03, AC-13)
  ok  9 [tablet]  › 01. Requester Context & Development Selector (AC-02, AC-12, UI Spec §4.1)
  ok 10 [tablet]  › 02. Create Ticket Form Initial State & Validation Errors (AC-04, AC-05, BR-05, BR-06)
  ok 11 [tablet]  › 03. Form Data Preservation on API Failure (AC-06, BR-07)
  ok 12 [tablet]  › 04. Successful Ticket Creation & Busy State (AC-01, BR-01..04)
  ok 13 [tablet]  › 05. My Tickets: Table View, Mobile View, Search, and Filtering (AC-07..11, NFR-01)
  ok 14 [tablet]  › 06. Requester Switching and Multi-User Isolation (AC-03, AC-11 State A, AC-12)
  ok 15 [tablet]  › 07. Ticket Detail Read-Only View & Attachment Lifecycle (AC-13..18, FR-10)
  ok 16 [tablet]  › 08. Cross-Requester Security 404 Verification (AC-03, AC-13)
  ok 17 [mobile]  › 01. Requester Context & Development Selector (AC-02, AC-12, UI Spec §4.1)
  ok 18 [mobile]  › 02. Create Ticket Form Initial State & Validation Errors (AC-04, AC-05, BR-05, BR-06)
  ok 19 [mobile]  › 03. Form Data Preservation on API Failure (AC-06, BR-07)
  ok 20 [mobile]  › 04. Successful Ticket Creation & Busy State (AC-01, BR-01..04)
  ok 21 [mobile]  › 05. My Tickets: Table View, Mobile View, Search, and Filtering (AC-07..11, NFR-01)
  ok 22 [mobile]  › 06. Requester Switching and Multi-User Isolation (AC-03, AC-11 State A, AC-12)
  ok 23 [mobile]  › 07. Ticket Detail Read-Only View & Attachment Lifecycle (AC-13..18, FR-10)
  ok 24 [mobile]  › 08. Cross-Requester Security 404 Verification (AC-03, AC-13)

 24 passed (27.5s)
```

---

## 7. Known Limitations or Deferred Tests
- Excluded Lab 2 scopes (real authentication, JWT tokens, IT Staff queue, ticket status transitions beyond `New`) are explicitly deferred to the next lab.