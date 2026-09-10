# Lab 3 Test Plan & Traceability Matrix

## TokTickIT — Users, Roles, IT Staff Ticketing, and Admin Screens

---

## 1. Test Architecture Overview

TokTickIT enforces a 6-tier test architecture to guarantee security boundaries, regression continuity, and operational reliability:

1. **Unit Testing:** Pure domain logic (password hashing, password complexity validator, status transition engine, query parser).
2. **Supertest API Integration Testing:** Full HTTP request/response validation against Express endpoints backed by PostgreSQL, enforcing authentication and RBAC middleware.
3. **Vitest Component Testing:** React Testing Library testing form validations, busy states, modal dialogs, and error alerts.
4. **UI Style & Accessibility Testing:** Verification of Zen Green design tokens, contrast ratios, and touch target bounds ($\ge 44\text{px}$).
5. **Responsive Layout Testing:** Automated assertion of layout adaptation across Desktop, Tablet, and Mobile viewports with zero horizontal scrolling.
6. **Playwright Multi-Viewport End-to-End Testing:** Realistic chained user journeys executing across Chromium Desktop (1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 2. Planned Tests Table

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **API-01** | API | AC-01 | Valid user authentication with correct email/password | HTTP 200 OK, sets session cookie, returns safe user object | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | AC-02 | Invalid credentials submission | HTTP 401 Unauthorized (`INVALID_CREDENTIALS`), no account leak | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | AC-03 | Login attempt on inactive account (`isActive: false`) | HTTP 403 Forbidden (`ACCOUNT_INACTIVE`) | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-04 | User profile retrieval via session (`GET /api/auth/me`) | HTTP 200 OK with authenticated user profile and role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | AC-05 | Password change with valid current and complex new password | HTTP 200 OK, clears `mustChangePassword`, updates bcrypt hash | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | AC-05 | Password change with weak password failing complexity | HTTP 400 Bad Request (`PASSWORD_COMPLEXITY_FAILED`) | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-07** | API | AC-06 | Session revocation on `POST /api/auth/logout` | HTTP 200 OK, clearing cookie; subsequent calls return 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-08** | API | AC-07 | Requester attempts to access staff queue (`/api/staff/tickets`) | HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-09** | API | AC-07 | Staff attempts to access admin user management (`/api/admin/users`) | HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-10** | API | AC-08 | Requester creates ticket; identity derived from session | HTTP 201 Created, ticket `requesterId` strictly matches `req.user.id` | `server/tests/lab-03/tickets.api.test.ts` | Pass |
| **API-11** | API | AC-09 | Requester accesses another requester's ticket directly | HTTP 404 Not Found (`TICKET_NOT_FOUND`) | `server/tests/lab-03/tickets.api.test.ts` | Pass |
| **API-12** | API | AC-10 | Add public comment by Requester on owned ticket | HTTP 201 Created, comment recorded with `authorId` | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-13** | API | AC-10 | Add public comment by IT Staff on any ticket | HTTP 201 Created, comment visible in public stream | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-14** | API | AC-11 | Requester indicates problem resolved | HTTP 200 OK, sets `resolvedByRequester = true`, status unchanged (BR-05) | `server/tests/lab-03/tickets.api.test.ts` | Pass |
| **API-15** | API | AC-12 | IT Staff queries ticket queue with search substring | HTTP 200 OK, returning matching tickets across all users | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-16** | API | AC-13 | IT Staff queries queue with category and priority filters | HTTP 200 OK, returning tickets matching intersection of filters | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-17** | API | AC-14 | IT Staff filters queue by `assigned=unassigned` and `assigned=me` | HTTP 200 OK, returning accurate subset based on `ticketOwnerId` | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-18** | API | AC-15 | IT Staff retrieves ticket detail (`GET /api/staff/tickets/:id`) | HTTP 200 OK with ticket, comments, and internal notes | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-19** | API | AC-16 | IT Staff claims ticket ownership | HTTP 200 OK, updating `ticketOwnerId` to current staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-20** | API | AC-17 | IT Staff modifies operational `itPriority` | HTTP 200 OK, updating `itPriority` independently of requested | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-21** | API | AC-18 | Valid status transition (`NEW` -> `OPEN`) | HTTP 200 OK, status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-22** | API | AC-18 | Invalid status transition (`NEW` -> `IN_PROGRESS` rejected) | HTTP 400 Bad Request (`INVALID_STATUS_TRANSITION`) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-23** | API | AC-19 | IT Staff creates private Internal Note | HTTP 201 Created, internal note saved | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-24** | API | AC-19 | Requester attempts to create or read Internal Note | HTTP 403 Forbidden; note content strictly concealed | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-25** | API | AC-20 | Admin creates user with initial password | HTTP 201 Created, `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-26** | API | AC-21 | Admin attempts self-deactivation | HTTP 400 Bad Request (`CANNOT_DEACTIVATE_SELF`) | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-27** | API | AC-22 | Admin attempts to deactivate the last active administrator | HTTP 400 Bad Request (`LAST_ADMIN_PROTECTED`) | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **UI-01** | Component | AC-01 | Login screen renders form and submits credentials | Input binding, busy state spinner, error banner presentation | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | Component | AC-04 | Mandatory password change modal intercepts navigation | Form validation checklist, disables submit until valid | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | Component | AC-07 | Role-based navigation renders appropriate tabs per role | Requester sees My Tickets; Staff sees Queue; Admin sees Users | `client/tests/lab-03/Navbar.test.tsx` | Pass |
| **UI-04** | Component | AC-12 | Staff ticket queue renders filter bar, data table, pagination | Filter interactions, sort header toggles, empty queue state | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-05** | Component | AC-15 | Staff ticket detail renders operational controls & notes | Dropdown edits, public comment stream, amber internal notes | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-06** | Component | AC-20 | Admin user management renders user table and creation drawer | User creation, role change, self-deactivation disabled toggle | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01..06 | Authentication, inactive account, and first-login password change | Complete browser journey across viewports | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | E2E | AC-08..19 | Requester creates ticket -> Staff claims, prioritizes, notes, resolves | End-to-end multi-role operational lifecycle | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-20..22 | Admin user creation, safety guardrails, and new user login change | User management workflow and security validation | `e2e/lab-03/user-administration.spec.ts` | Pass |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criteria ID | Covered Capabilities | Automated Test Identifier(s) | Status |
| :---: | :--- | :--- | :---: |
| **AC-01** | Valid User Login & Session | `API-01`, `UI-01`, `E2E-01` | **Planned** |
| **AC-02** | Invalid Credentials Rejection | `API-02`, `UI-01`, `E2E-01` | **Planned** |
| **AC-03** | Inactive Account Login Blocking | `API-03`, `UI-01`, `E2E-01` | **Planned** |
| **AC-04** | Mandatory First Password Change Gate | `API-05`, `UI-02`, `E2E-01` | **Planned** |
| **AC-05** | Password Complexity Rules | `API-06`, `UI-02`, `E2E-01` | **Planned** |
| **AC-06** | Session Termination on Logout | `API-07`, `UI-03`, `E2E-01` | **Planned** |
| **AC-07** | Role-Based Access Control Middleware | `API-08`, `API-09`, `UI-03` | **Planned** |
| **AC-08** | Requester Ticket Creation Attribution | `API-10`, `E2E-02` | **Planned** |
| **AC-09** | Requester Ownership Boundary Isolation | `API-11`, `E2E-02` | **Planned** |
| **AC-10** | Public Comments Submission & Stream | `API-12`, `API-13`, `UI-05`, `E2E-02` | **Planned** |
| **AC-11** | Requester Problem Resolved Indication | `API-14`, `UI-05`, `E2E-02` | **Planned** |
| **AC-12** | IT Staff Ticket Queue Search | `API-15`, `UI-04`, `E2E-02` | **Planned** |
| **AC-13** | IT Staff Queue Multi-Criteria Filters | `API-16`, `UI-04`, `E2E-02` | **Planned** |
| **AC-14** | IT Staff Queue Ownership Filtering | `API-17`, `UI-04`, `E2E-02` | **Planned** |
| **AC-15** | IT Staff Ticket Detail Retrieval | `API-18`, `UI-05`, `E2E-02` | **Planned** |
| **AC-16** | Ticket Ownership Claiming & Reassignment | `API-19`, `UI-05`, `E2E-02` | **Planned** |
| **AC-17** | Operational IT Priority Modification | `API-20`, `UI-05`, `E2E-02` | **Planned** |
| **AC-18** | Governed Status Transitions (8 Statuses) | `API-21`, `API-22`, `UI-05`, `E2E-02` | **Planned** |
| **AC-19** | Private Internal Notes Secrecy (403 for Requester) | `API-23`, `API-24`, `UI-05`, `E2E-02` | **Planned** |
| **AC-20** | Admin User Creation with Initial Password | `API-25`, `UI-06`, `E2E-03` | **Planned** |
| **AC-21** | Admin Self-Deactivation Prevention | `API-26`, `UI-06`, `E2E-03` | **Planned** |
| **AC-22** | Protection of Last Active Administrator | `API-27`, `UI-06`, `E2E-03` | **Planned** |

---

## 4. Test Execution Commands

```bash
# 1. Server Unit and Supertest Integration Tests
cd server && npm test

# 2. Client Component and Style Tests
cd client && npm test

# 3. Playwright Multi-Viewport E2E Suites
npx playwright test
```
