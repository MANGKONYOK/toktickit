# Lab 2 Test Plan and Results

## 1. Test Strategy
Sprint 2 enforces strict Spec-Driven Development (Spec DD) and Test-Driven Development (TDD). The testing strategy spans four distinct levels of verification:
1. **Unit Tests (Vitest):** Validate utility helpers, validation logic, formatting functions and the sequential `Ticket Number` generator (`TKT-YYYY-NNNNNN`).
2. **API Tests (Supertest / Vitest):** Validate all Express REST routes under `server/tests/lab-02/`, checking database persistence, input validation schemas, ownership isolation, pagination, sorting, file upload restrictions and attachment soft-removal.
3. **UI Component Tests (Vitest / React Testing Library):** Validate individual React views and components under `client/tests/lab-02/`, verifying initial render states, field validation error placement, button busy/loading indicators, modal dialogues and responsive classes.
4. **End-to-End Tests (Playwright):** Validate complete user flows in `e2e/lab-02/requester-ticket-flow.spec.ts` across multiple viewport dimensions (Desktop, Tablet, Mobile), simulating multi-user ticket creation, search/filter, detail view and attachment lifecycle.

---

## 2. Planned Tests

| Test ID | Level | Requirement / AC | Test Description | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **API-01** | API | AC-01, FR-04 | Create valid ticket with required fields | `201 Created`; ticket created with format `TKT-YYYY-NNNNNN` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-02** | API | AC-05, BR-05 | Reject ticket creation with missing/invalid summary | `400 Bad Request` with field validation details | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03** | API | AC-05, BR-05 | Reject ticket creation with invalid category/system | `400 Bad Request` or `404 Not Found` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | AC-02, FR-01 | Retrieve active requesters list | `200 OK`; returns 4 active users; excludes inactive | `server/tests/lab-02/requesters.api.test.ts` | Planned |
| **API-05** | API | AC-04, FR-03 | Retrieve reference data (Categories & Systems) | `200 OK`; returns 4 categories and 7 related systems | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| **API-06** | API | AC-07, AC-08 | Query tickets with search, category/priority/status filters | `200 OK`; returns filtered subset with pagination meta | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | AC-09, AC-10 | Query tickets with custom sorting and pagination | `200 OK`; returns ordered results with correct page/limit | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | API | AC-03, FR-06 | Multi-user isolation: query tickets of another requester | `200 OK`; only tickets owned by query requesterId returned | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-09** | API | AC-13, FR-10 | Retrieve owned ticket detail with attachments | `200 OK`; returns ticket header and attachment list | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-10** | API | AC-03, FR-06 | Unauthorized access: get ticket of another requester | `403 Forbidden` / `404 Not Found` | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-11** | API | AC-14, FR-11 | Upload valid attachment ($\le 5\text{MB}$, JPG/PNG/PDF) | `201 Created`; attachment stored and metadata returned | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-12** | API | AC-15, BR-09 | Reject oversized attachment (>5MB) or invalid MIME | `413 Payload Too Large` / `415 Unsupported Media` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-13** | API | AC-16, BR-10 | Reject 6th active attachment upload | `400 Bad Request`; maximum 5 active limit reached | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-14** | API | AC-17, BR-11 | Soft-remove attachment with valid reason | `200 OK`; `removedAt` set, metadata retained | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-15** | API | AC-18, BR-12 | Block download for soft-removed attachment | `410 Gone` / `404 Not Found`; binary download rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | UI | AC-02, FR-01 | Render Requester Selector when no context selected | Selector dropdown displayed with active users | `client/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-02** | UI | AC-05, BR-05 | Show inline field validation errors on empty submit | Red error messages displayed below invalid inputs | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-03** | UI | AC-01, BR-14 | Submit button displays busy state during async call | Button disabled with loading indicator | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | UI | AC-06, BR-07 | Preserve form field values when API submission fails | Inputs retained, error alert shown | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | UI | AC-11, FR-09 | Display empty state vs no-results search filter state | Distinct empty state callouts rendered | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-06** | UI | AC-13, FR-10 | Ticket detail renders all header fields as read-only | Shaded background `#F0F4F1`, inputs non-editable | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| **UI-07** | UI | AC-17, BR-11 | Soft removal modal prompts for removal reason | Reason textarea required before confirm enabled | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **E2E-01**| E2E | AC-01..18 | Full Requester journey: create, list, filter, detail, attachments | All actions complete across Desktop/Tablet/Mobile | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Verification Level | Covered By Tests |
| :--- | :--- | :--- |
| **AC-01** (Ticket Creation Success) | API / UI / E2E | `API-01`, `UI-03`, `E2E-01` |
| **AC-02** (Requester Context Gate) | API / UI / E2E | `API-04`, `UI-01`, `E2E-01` |
| **AC-03** (Ownership Isolation) | API / E2E | `API-08`, `API-10`, `E2E-01` |
| **AC-04** (Reference Data Load) | API / UI | `API-05`, `E2E-01` |
| **AC-05** (Field Validation Feedback) | API / UI / E2E | `API-02`, `API-03`, `UI-02`, `E2E-01` |
| **AC-06** (Form Data Preservation) | UI / E2E | `UI-04`, `E2E-01` |
| **AC-07** (Ticket Search) | API / E2E | `API-06`, `E2E-01` |
| **AC-08** (Multi-Filter Combination) | API / E2E | `API-06`, `E2E-01` |
| **AC-09** (Sorting Consistency) | API / E2E | `API-07`, `E2E-01` |
| **AC-10** (Pagination Mechanics) | API / E2E | `API-07`, `E2E-01` |
| **AC-11** (Empty vs No-Results State) | UI / E2E | `UI-05`, `E2E-01` |
| **AC-12** (Switch Requester Context) | UI / E2E | `UI-01`, `E2E-01` |
| **AC-13** (Read-Only Ticket Detail) | API / UI / E2E | `API-09`, `UI-06`, `E2E-01` |
| **AC-14** (Valid Attachment Upload) | API / E2E | `API-11`, `E2E-01` |
| **AC-15** (Reject Invalid Attachment) | API / E2E | `API-12`, `E2E-01` |
| **AC-16** (Enforce 5 Attachments Limit)| API / E2E | `API-13`, `E2E-01` |
| **AC-17** (Soft Removal with Reason) | API / UI / E2E | `API-14`, `UI-07`, `E2E-01` |
| **AC-18** (Blocked Removed Download) | API / E2E | `API-15`, `E2E-01` |

---

## 4. Responsive and Visual Checklist
- [ ] Desktop Viewport (>= 992px): Multi-column grid, max-width 1200px container, full table view.
- [ ] Tablet Viewport (768px - 991px): 2-column form layout, compact/scrollable table.
- [ ] Mobile Viewport (< 768px): Single-column stacked layout, ticket cards, touch targets >= 44px, zero horizontal scrolling.

---

## 5. Test Execution Commands

```powershell
# 1. Run all Backend API & Unit Tests
cd server; npm test

# 2. Run all Frontend Component & UI Tests
cd client; npm test

# 3. Run End-to-End Playwright Tests
npx playwright test
```

---

## 6. Final Results
*(Will be updated with terminal outputs and test logs as implementation progresses.)*

---

## 7. Known Limitations or Deferred Tests
- Excluded Lab 2 scopes (real authentication, JWT tokens, IT Staff queue, ticket status transitions beyond `New`) are explicitly deferred to the next lab.