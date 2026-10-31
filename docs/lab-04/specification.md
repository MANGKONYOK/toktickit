# Lab 4 Sprint Engineering Specification

## TokTickIT — Actions Taken, Dashboards, and Final Regression

---

## 1. Sprint Goal

Deliver the final production increment for TokTickIT (CPE 334 Lab 4) by introducing a parent-child Actions Taken tracking system under tickets, enforcing an authoritative ticket resolution gate with optimistic concurrency conflict detection, providing role-appropriate operational dashboards with filtered drill-down navigation for Requesters, IT Staff, and Administrators, and hardening the entire application across desktop, tablet, and mobile viewports with 100% regression preservation of all capabilities delivered in Labs 1 through 3 under the Zen Green design system.

---

## 2. Stakeholder Request Interpretation

The IT Department and service-desk leadership require TokTickIT to transition from a communication and assignment queue into a complete, hardened operational service-desk system:

1. **Actions Taken Tracking:** While a primary Ticket Owner coordinates each ticket overall, actual work is often performed by multiple specialists over time. IT Staff and Administrators must be able to log granular actions under each ticket, recording the exact action timestamp, description of work performed, concrete result obtained, auto-bound performer identity, follow-up requirement indicator with mandatory notes, and references to supporting attachment artifacts.
2. **Authoritative Resolution Gate & Concurrency:** Requesters may indicate that a reported issue appears resolved to them (advisory), but IT Staff must formally review the actions taken and advance the ticket to `RESOLVED` status. The system must prevent race conditions and blind overwrites when multiple staff or requesters interact with the same ticket concurrently.
3. **Role-Appropriate Operational Dashboards:** Service desk actors require immediate visibility into work requiring attention without repeatedly querying full data tables. Requesters need a concise summary of their open, waiting, and recently resolved requests. IT Staff need operational metrics (unassigned queue size, personal work queues, status/priority distributions, and recent actions). Administrators require system-level user health metrics alongside staff operational queues. All metrics must link directly to pre-filtered queues.
4. **Final Regression & Polish:** All features built across Labs 1 through 3 (authentication, password changes, RBAC, ticket creation, attachments, public comments, internal notes, staff queue filtering, and administrator user management) must continue to function flawlessly under a coherent, accessible, responsive Zen Green interface.

---

## 3. Scope Boundaries

### 3.1. Included Scope

- **Actions Taken Data Model & Management:** Parent-child 1:N relationship between Ticket and ActionTaken; IT Staff and Admin creation and modification of action items; automatic binding of performer identity to authenticated session (`req.user.id`).
- **Conditional Follow-Up Governance:** Enforcement of mandatory follow-up notes when `followUpRequired` is flagged true; optional attachment note references for images or external files.
- **Requester Read-Only Action Visibility:** Transparent visibility for Requesters into action items on their owned tickets; strict rejection of requester mutation attempts with HTTP 403 Forbidden.
- **Collaborative Multi-Staff Action Recording:** Any authorized IT Staff or Admin may log actions on an accessible ticket, even when assigned to a different primary owner.
- **Governed 8-State Ticket Lifecycle & Resolution Gate:** Authoritative enforcement of valid status transitions (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`); Requester resolution indication remains advisory (`resolvedByRequester = true`) while formal status change to `RESOLVED` requires IT Staff / Admin action.
- **Optimistic Concurrency Control:** Concurrency detection using `updatedAt` timestamps on ticket status transitions and workflow updates, returning HTTP 409 Conflict upon stale collisions.
- **Requester Dashboard:** Summary metric cards (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`), recent ticket activity list, and drill-down links to filtered `/tickets` views.
- **IT Staff Dashboard:** Operational metric cards (`unassignedTickets`, `myAssignedTickets`, `ticketsByStatus`, `ticketsByPriority`), current-user recent actions log, urgent tickets table, and drill-down links to filtered `/staff/tickets` views.
- **Administrator Dashboard:** Integrated IT Staff dashboard view augmented with user account health cards (`totalUsers`, `activeUsers`, `inactiveUsers`).
- **Zen Green Responsive Layout & Accessibility:** Consistent, accessible UI across Desktop (>= 992px), Tablet (768px - 991px), and Mobile (< 768px) with zero horizontal scrolling.
- **Full Regression Coverage:** 100% preservation of all features from Labs 1, 2, and 3 with zero data loss on database schema evolution.

### 3.2. Explicitly Excluded Scope (Do NOT Implement)

- Automatic SLA countdown timers, auto-escalation background engines, or breach alerts.
- External notification services (SMTP emails, SMS gateways, LINE Notify, or push notifications).
- Inventory consumption, hardware asset tracking, spare-parts catalogs, or supplier purchase orders.
- Time-sheet billing, contractor hourly rates, payroll integration, or labor-cost calculations.
- Multi-level electronic signature workflows, legal sign-offs, or executive approval gates.
- Custom ad-hoc business intelligence report builders or external data warehouse pipelines.
- Multi-tenant database tenancy, organization partitioning, or public SaaS registration.

---

## 4. Functional Requirements (FR-01 through FR-16)

- **FR-01 (Actions Taken Relational Model):** The system shall persist multiple Action Taken records under a parent Ticket, maintaining foreign-key integrity, cascade deletion with parent ticket, and creation/update audit timestamps.
- **FR-02 (Action Taken Creation by IT Staff):** The system shall allow authenticated users with role `IT_STAFF` or `ADMIN` to record an Action Taken on any accessible ticket, automatically binding `performedById` to the authenticated session user.
- **FR-03 (Action Taken Field Validation):** The system shall validate that `actionDateTime` is a valid ISO date-time, `description` contains 1 to 2,000 characters, `result` contains 1 to 2,000 characters, `followUpRequired` is a boolean, `followUpNote` contains 1 to 1,000 characters when `followUpRequired` is true, and `attachmentNotes` is optional (max 1,000 characters).
- **FR-04 (Action Taken Modification):** The system shall allow authorized IT Staff and Administrators to update existing Action Taken records, updating the record's `updatedAt` timestamp while preserving the original `performedById` or recording editor identity.
- **FR-05 (Requester Action Visibility & Read-Only Seam):** The system shall allow Requesters to view all Action Taken items on tickets they own, but shall strictly reject any Requester create, update, or delete attempts with HTTP 403 Forbidden.
- **FR-06 (Multi-Staff Collaboration):** The system shall permit any active IT Staff member or Administrator to record an action on a ticket, even if another IT Staff member is designated as the primary `ticketOwnerId`.
- **FR-07 (Authoritative Ticket Resolution Gate):** The system shall restrict transitioning ticket status to `RESOLVED` to users with role `IT_STAFF` or `ADMIN`. The Requester problem resolved indication shall remain advisory (`resolvedByRequester = true`) and shall not directly transition status to `RESOLVED`.
- **FR-08 (Optimistic Concurrency & Conflict Detection):** The system shall require client requests updating ticket status or core attributes to submit an `expectedUpdatedAt` timestamp. If the database record has been modified by another actor in the interim, the API shall return HTTP 409 Conflict with the current ticket state.
- **FR-09 (8-State Ticket Lifecycle Transition Matrix):** The system shall strictly enforce permitted state transitions across `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **FR-10 (Requester Dashboard Metrics Calculation):** The system shall compute authoritative metric counts for the authenticated Requester: total open tickets, tickets waiting for requester input, tickets updated within the last 7 days, and tickets resolved within the last 30 days.
- **FR-11 (Requester Dashboard Drill-Down):** The system shall provide clickable navigation on each Requester metric card that routes to `/tickets` with appropriate URL query parameters (`status=OPEN`, `status=WAITING_FOR_REQUESTER`, etc.).
- **FR-12 (IT Staff Dashboard Operational Metrics):** The system shall compute operational metrics across all tickets for IT Staff: count of unassigned tickets, count of tickets assigned to the current user, distribution by status, distribution by operational IT priority, and recent actions logged by the current user.
- **FR-13 (IT Staff Dashboard Drill-Down):** The system shall provide clickable navigation on each IT Staff metric card that routes to `/staff/tickets` with corresponding query parameters (`assigned=unassigned`, `assigned=me`, `status=*`, `priority=*`).
- **FR-14 (Administrator Dashboard Augmentation):** The system shall provide Administrators with the IT Staff operational dashboard augmented by user management summary metrics (`totalUsers`, `activeUsers`, `inactiveUsers`, and counts by role) linking directly to `/admin/users`.
- **FR-15 (Zen Green UI Polish & Responsive Shell):** The system shall render all Lab 4 dashboard cards, action timelines, forms, and modals according to Zen Green design tokens across desktop, tablet, and mobile viewports with zero horizontal scrolling.
- **FR-16 (Full Labs 1-3 Non-Breaking Regression):** The system shall preserve 100% of previously delivered capabilities: credential authentication, password change enforcement, requester ticket submission, file attachment lifecycle, public comment threads, confidential internal notes, staff queue filtering, and administrator user management.

---

## 5. Business Rules (BR-01 through BR-25)

### 5.1. Actions Taken Business Rules

- **BR-01 (Parent-Child Integrity):** Every Action Taken record must belong to exactly one valid parent Ticket (`ticketId` is mandatory and foreign-keyed to `Ticket.id`).
- **BR-02 (Performer Identity Authority):** The performer identity (`performedById`) must be derived strictly from the authenticated server session (`req.user.id`). Client requests attempting to inject or spoof a `performedById` must be ignored or rejected.
- **BR-03 (Collaborative Action Recording):** Any active user with role `IT_STAFF` or `ADMIN` may create an Action Taken on any non-terminal ticket, regardless of whether that user is the assigned `ticketOwnerId`.
- **BR-04 (Mandatory Follow-Up Note):** When `followUpRequired` is `true`, `followUpNote` must not be null, empty, or whitespace-only (length between 1 and 1,000 characters). When `followUpRequired` is `false`, `followUpNote` is optional and may be null or empty.
- **BR-05 (Action Text Limits):** `description` and `result` must each contain between 1 and 2,000 characters after trimming whitespace. Blank or whitespace-only strings are rejected with HTTP 400 Bad Request.
- **BR-06 (Action Taken Chronological Order):** Actions Taken on a ticket must be ordered deterministically by `actionDateTime ASC`, with secondary tie-breaker `id ASC`.
- **BR-07 (Requester Read-Only Access):** Requesters may only view Actions Taken on tickets where `ticket.requesterId == req.user.id`. Any attempt by a Requester to call `POST`, `PATCH`, or `DELETE` on Actions Taken endpoints must return HTTP 403 Forbidden.
- **BR-08 (Attachment Notes Reference):** `attachmentNotes` is an optional descriptive string (max 1,000 characters) documenting relevant filenames or visual cues; it does not replace or modify the authoritative `Attachment` relational table.

### 5.2. Workflow, Resolution & Concurrency Rules

- **BR-09 (Authoritative Resolution Gate):** Transitioning a ticket to `RESOLVED` status requires explicit action by an authenticated user with role `IT_STAFF` or `ADMIN`.
- **BR-10 (Advisory Requester Resolution):** When a Requester clicks "Problem Resolved", the system sets `resolvedByRequester = true` and appends an audit comment, but does NOT advance `currentStatus` to `RESOLVED`.
- **BR-11 (Governed Status Transition Matrix):** Transitions must strictly follow the validated lifecycle graph:
  - `NEW` -> `OPEN`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `REOPENED` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `CLOSED` -> [Terminal State — No further transitions permitted]
  - `CANCELLED` -> [Terminal State — No further transitions permitted]
- **BR-12 (Terminal State Mutability Lock):** Once a ticket enters a terminal state (`CLOSED` or `CANCELLED`), no new Actions Taken, status changes, internal notes, or public comments may be added. Attempts return HTTP 400 Bad Request.
- **BR-13 (Optimistic Concurrency Check):** All status mutation and core ticket update endpoints must accept `expectedUpdatedAt`. If the database `ticket.updatedAt` timestamp does not match `expectedUpdatedAt`, the API must reject the operation with HTTP 409 Conflict, returning the current database state so the client can prompt the user to refresh.
- **BR-14 (Anti-Enumeration Ownership Seam):** Requests by a Requester for ticket details, actions, or status updates on a ticket owned by another user must return HTTP 404 Not Found (never HTTP 403) to prevent ticket existence enumeration.

### 5.3. Dashboard Calculation Business Rules

- **BR-15 (Authoritative Backend Metrics):** All dashboard numbers must be calculated by authoritative database queries on the server. Frontends must never fetch all tickets into memory to compute metrics client-side.
- **BR-16 (Requester Total Open):** Count of tickets where `requesterId == req.user.id` and `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
- **BR-17 (Requester Waiting for Requester):** Count of tickets where `requesterId == req.user.id` and `currentStatus == 'WAITING_FOR_REQUESTER'`.
- **BR-18 (Requester Recently Updated):** Count of tickets where `requesterId == req.user.id` and `updatedAt >= NOW() - INTERVAL '7 days'`.
- **BR-19 (Requester Recently Resolved):** Count of tickets where `requesterId == req.user.id` and `currentStatus IN ('RESOLVED', 'CLOSED')` and `updatedAt >= NOW() - INTERVAL '30 days'`.
- **BR-20 (Staff Unassigned Tickets):** Count of tickets where `currentStatus NOT IN ('CLOSED', 'CANCELLED')` and `ticketOwnerId IS NULL`.
- **BR-21 (Staff My Assigned Tickets):** Count of tickets where `ticketOwnerId == req.user.id` and `currentStatus NOT IN ('CLOSED', 'CANCELLED')`.
- **BR-22 (Staff Status Distribution):** Counts grouped by `currentStatus` across all non-terminal tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`, `RESOLVED`).
- **BR-23 (Staff Priority Distribution):** Counts grouped by `itPriority` across all active, open tickets (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **BR-24 (Staff Current-User Recent Actions):** The 5 most recent Action Taken records where `performedById == req.user.id`, ordered by `actionDateTime DESC`.
- **BR-25 (Zero and Empty States):** When any metric count equals 0 or a list returns empty, the API must return `0` or `[]` with HTTP 200 OK. The frontend must display clean, reassuring empty-state cards rather than blank screens or errors.

---

## 6. UI Specification Summary

### 6.1. IT Staff Dashboard (`/staff/dashboard`)
- **Metric Cards Grid:** 4-column layout on desktop, 2-column on tablet, 1-column on mobile.
  - Card 1: *Unassigned Tickets* (amber badge when > 0, links to `/staff/tickets?assigned=unassigned`).
  - Card 2: *My Active Tickets* (green badge, links to `/staff/tickets?assigned=me`).
  - Card 3: *Waiting for Requester* (links to `/staff/tickets?status=WAITING_FOR_REQUESTER`).
  - Card 4: *Urgent Priority* (rose/red badge when > 0, links to `/staff/tickets?priority=URGENT`).
- **Operational Status & Priority Breakdown:** Visual progress/bar breakdown with counts.
- **Recent Actions Log:** Displays the last 5 actions logged by the current user with ticket number, date, result snippet, and direct link to ticket detail.
- **Urgent & Stale Attention List:** Compact table displaying the top 5 urgent or unassigned tickets requiring immediate staff triage.

### 6.2. Requester Dashboard (`/dashboard`)
- **Metric Cards Grid:**
  - Card 1: *Open Requests* (links to `/tickets?tab=open`).
  - Card 2: *Waiting on Your Input* (highlighted alert border when > 0, links to `/tickets?tab=waiting`).
  - Card 3: *Recently Updated* (links to `/tickets?tab=recent`).
  - Card 4: *Resolved & Closed* (links to `/tickets?tab=resolved`).
- **Recent Requests Table:** Summary of the 5 most recent tickets with status badge, priority badge, last updated relative time, and view link.
- **Quick Action:** Prominent "Create New Ticket" button directing to `/tickets/new`.

### 6.3. Actions Taken on Ticket Detail (`/staff/tickets/:id` & `/tickets/:id`)
- **Staff Ticket Detail View:** Dedicated "Actions Taken" panel placed prominently alongside Public Comments and Internal Notes.
  - Header with total action count badge and "Record Action" button.
  - Action Timeline/Table: Each action card displays Action Date/Time, Performer Name and Role badge, Action Description, Result text, Follow-up indicator (with amber highlight note if required), and Attachment Notes reference.
  - "Edit" action button on each item opening modal/inline edit form.
  - Create Action Form / Modal:
    - Action Date/Time (default: current local ISO timestamp).
    - Performer: Read-only display of current authenticated user (`req.user.fullName`).
    - Action Description (textarea, 1..2000 chars, remaining counter).
    - Result (textarea, 1..2000 chars).
    - "Follow-Up Required?" checkbox toggle.
    - Follow-Up Note textarea (conditionally visible and required when checkbox is checked).
    - Attachment Notes input (optional text, e.g., "See screenshot server_error.png").
    - Action buttons: "Save Action" (primary green) and "Cancel".
- **Requester Ticket Detail View:** Read-only "Actions Taken" timeline displaying what steps IT Staff have taken to solve their issue, without edit or create buttons.

### 6.4. Ticket Status Controls & Concurrency Modal
- Dropdown or button group displaying only valid transitions allowed from current status.
- When an optimistic concurrency conflict (HTTP 409) occurs:
  - Form displays an alert banner: *"Ticket was updated by another user while you were viewing it."*
  - Provides a "Reload Latest Data" button to pull current server state without losing unsaved form drafts where possible.

---

## 7. Data Changes & Architectural Decisions

### 7.1. Prisma Schema Evolution

```prisma
model ActionTaken {
  id               Int       @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actionDateTime   DateTime  @default(now())
  description      String    @db.Text
  result           String    @db.Text
  performedById    Int
  performedBy      User      @relation(fields: [performedById], references: [id])
  followUpRequired Boolean   @default(false)
  followUpNote     String?   @db.Text
  attachmentNotes  String?   @db.Text
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([ticketId, actionDateTime(sort: Asc)])
  @@index([performedById])
}
```

- In `User` model: `actionsTaken ActionTaken[]` relation added.
- In `Ticket` model: `actionsTaken ActionTaken[]` relation added.

### 7.2. Two Mandatory Database Design Justifications

1. **Architectural Justification 1: Parent-Child Cascade & Composite Indexing**
   - *Decision:* `Ticket` to `ActionTaken` is established with `onDelete: Cascade` and indexed composite `@@index([ticketId, actionDateTime(sort: Asc)])`.
   - *Rationale:* Actions Taken represent immutable work history tightly coupled to the lifecycle of a ticket. If a test or development ticket is purged, orphaned actions must not remain. Indexing `ticketId` combined with `actionDateTime` guarantees index-only scans when rendering ticket detail timelines, avoiding sequential scans as action history grows into thousands of entries.
2. **Architectural Justification 2: Optimistic Concurrency Control via `updatedAt`**
   - *Decision:* Concurrency detection leverages Prisma's native `@updatedAt` timestamp on the `Ticket` model without adding external locking tables or heavy pessimistic database row locks.
   - *Rationale:* Service desk environments involve distributed asynchronous collaboration where multiple IT Staff may view the same ticket concurrently while a requester provides feedback. Row-level pessimistic locks (`SELECT FOR UPDATE`) would introduce potential database deadlocks and degrade throughput. Optimistic concurrency with HTTP 409 Conflict provides fail-safe, non-destructive collision prevention with minimal database overhead.

### 7.3. Migration & Backfill Strategy
- The Prisma migration `add_actions_taken_model` is strictly additive.
- Existing tickets from Labs 1, 2, and 3 have zero actions taken initially; queries handle empty action arrays gracefully.
- All legacy users, tickets, attachments, comments, and internal notes remain 100% intact.

### 7.4. Idempotent Seed Data Requirements
The seed script (`server/prisma/seed.ts`) must provision realistic scenarios:
- Tickets with 0 actions taken (newly submitted tickets).
- Tickets with 1 action taken (initial triage).
- Tickets with multiple actions taken logged by different IT Staff members.
- Tickets with `followUpRequired = true` and detailed follow-up notes.
- Data sufficient to demonstrate both non-zero and zero metric cards across Requesters and IT Staff.

---

## 8. REST API Contract Summary

| Method | Endpoint | Allowed Roles | Description & Concurrency Behavior |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tickets/:id/actions` | Authenticated | List all actions for ticket. Requesters can only access owned tickets (HTTP 404 on unowned). |
| `POST` | `/api/tickets/:id/actions` | `IT_STAFF`, `ADMIN` | Create action taken. `performedById` auto-bound to session. Returns HTTP 201. |
| `PATCH` | `/api/tickets/:id/actions/:actionId` | `IT_STAFF`, `ADMIN` | Update action taken. Returns HTTP 200. |
| `PATCH` | `/api/tickets/:id/status` | `IT_STAFF`, `ADMIN` | Advance status. Validates `expectedUpdatedAt`. Returns HTTP 409 on conflict. |
| `GET` | `/api/dashboard/requester` | `REQUESTER`, `ADMIN` | Returns authenticated requester's metric counters and recent tickets. |
| `GET` | `/api/dashboard/staff` | `IT_STAFF`, `ADMIN` | Returns operational desk metrics, status/priority distributions, and recent actions. |
| `GET` | `/api/dashboard/admin` | `ADMIN` | Returns staff metrics augmented with user account statistics. |

---

## 9. Acceptance Criteria (AC-01 through AC-22)

- **AC-01:** Given an authenticated IT Staff member, when submitting valid action fields (`description`, `result`, `actionDateTime`) via `POST /api/tickets/:id/actions`, then the action is persisted with `performedById` bound to the caller's session ID and HTTP 201 is returned.
- **AC-02:** Given an authenticated Requester, when attempting to call `POST /api/tickets/:id/actions`, then the API rejects the request with HTTP 403 Forbidden.
- **AC-03:** Given an authenticated user, when querying `GET /api/tickets/:id/actions` for a ticket owned by another requester, if caller is a Requester then HTTP 404 is returned; if caller is IT Staff/Admin then HTTP 200 with the actions array is returned.
- **AC-04:** Given an action submission with `followUpRequired = true` and an empty `followUpNote`, when submitted to `POST /api/tickets/:id/actions`, then the API rejects the submission with HTTP 400 Bad Request.
- **AC-05:** Given an action submission with `followUpRequired = false`, when submitted with or without `followUpNote`, then the action is successfully created.
- **AC-06:** Given an existing Action Taken, when an authorized IT Staff member submits updated fields via `PATCH /api/tickets/:id/actions/:actionId`, then the record is updated, `updatedAt` is refreshed, and HTTP 200 is returned.
- **AC-07:** Given a ticket in `OPEN` status, when an IT Staff member records an action and a different IT Staff member records a second action, then both actions are persisted under the ticket displaying their respective performer names.
- **AC-08:** Given a ticket in `OPEN` status, when the owning Requester clicks "Problem Resolved", then `resolvedByRequester` is set to `true`, an automated public comment is posted, but `currentStatus` remains `OPEN`.
- **AC-09:** Given a ticket in `OPEN` status, when an IT Staff member updates `currentStatus` to `RESOLVED`, then the status transitions to `RESOLVED` and HTTP 200 is returned.
- **AC-10:** Given a ticket in `NEW` status, when a client attempts an invalid transition to `RESOLVED` directly, then the API rejects the transition with HTTP 400 Bad Request.
- **AC-11:** Given a client submitting a status update with an `expectedUpdatedAt` timestamp older than the current database timestamp, then the API returns HTTP 409 Conflict.
- **AC-12:** Given a ticket in `CLOSED` or `CANCELLED` status, when attempting to create a new Action Taken or update status, then the API returns HTTP 400 Bad Request indicating the ticket is locked.
- **AC-13:** Given an authenticated Requester calling `GET /api/dashboard/requester`, then the response contains `totalOpen`, `waitingForRequester`, `recentlyUpdated`, and `recentlyResolved` strictly calculated from the caller's owned tickets.
- **AC-14:** Given an authenticated IT Staff member calling `GET /api/dashboard/staff`, then the response contains accurate counts for unassigned tickets, current user assigned tickets, breakdown by status, breakdown by IT priority, and recent actions by the caller.
- **AC-15:** Given an authenticated Requester with zero tickets, when calling `GET /api/dashboard/requester`, then the API returns 0 for all metrics and an empty array for recent tickets with HTTP 200 OK.
- **AC-16:** Given the Requester Dashboard UI, when clicking the "Open Requests" metric card, then the browser navigates to `/tickets?tab=open`.
- **AC-17:** Given the IT Staff Dashboard UI, when clicking the "Unassigned Tickets" metric card, then the browser navigates to `/staff/tickets?assigned=unassigned`.
- **AC-18:** Given the IT Staff Dashboard UI, when clicking the "My Active Tickets" metric card, then the browser navigates to `/staff/tickets?assigned=me`.
- **AC-19:** Given the Ticket Detail page on desktop (1280px), when viewing Actions Taken, then the layout displays actions in a timeline card format with clear performer, timestamp, description, and follow-up badges.
- **AC-20:** Given the Ticket Detail page on mobile (375px), when viewing Actions Taken, then all action cards reflow vertically with zero horizontal page scrolling.
- **AC-21:** Given an Administrator calling `GET /api/dashboard/admin`, then the response includes staff operational metrics plus user account statistics (`totalUsers`, `activeUsers`, `inactiveUsers`).
- **AC-22:** Given the complete test suite executed on `main`, all automated tests across Labs 1, 2, 3, and 4 pass with 100% green status.

---

## 10. Definition of Done (DoD) for Sprint 4

> Note: All checkboxes are initialized to unchecked (`[ ]`) to document the pre-implementation baseline of Feature 1.

- [ ] **Contract & Specification:** Complete `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` authored, reviewed, and merged into `lab4-staging`.
- [ ] **Database & Migrations:** Prisma schema evolved with `ActionTaken` model, non-destructive migration executed, and idempotent seeds provisioned.
- [ ] **Actions Taken Backend:** REST endpoints (`POST`, `GET`, `PATCH /api/tickets/:id/actions`) implemented with session-bound actor, field validation, and RBAC.
- [ ] **Actions Taken Frontend:** Interactive timeline/table, Create modal with dynamic follow-up toggle, Edit modal, and Requester read-only view.
- [ ] **Workflow & Concurrency Gate:** Authoritative resolution gate enforced; optimistic concurrency conflict detection returning HTTP 409 implemented and tested.
- [ ] **Role Dashboards:** Requester, Staff, and Admin dashboard endpoints and Zen Green UI components implemented with interactive drill-down routing.
- [ ] **Automated Test Suites:** Unit, API integration, UI component, responsive, authorization, workflow, regression, and Playwright E2E suites passing.
- [ ] **Peer Review Record:** Substantive peer review comments and author responses documented in `reviewer.md` for PR #1 through PR #7.
- [ ] **Visual Evidence:** High-resolution screenshots captured across Desktop, Tablet, and Mobile viewports in `artifacts/lab-04/screenshots/`.
- [ ] **Final Integration:** `lab4-staging` merged into `main` with 100% clean test passes and zero regression defects.

---

## 11. Assumptions and Technical Decisions

1. **Optimistic Locking Attribute:** Concurrency uses the existing `Ticket.updatedAt` timestamp serialized as an ISO-8601 string. If `new Date(clientTimestamp).getTime() !== new Date(dbTimestamp).getTime()`, HTTP 409 is triggered.
2. **Dashboard Query Performance:** Metrics are computed using lightweight Prisma `.count()` and `.groupBy()` aggregates directly in PostgreSQL, eliminating overhead and memory bloat.
3. **Date Boundaries:** "Recently Updated" is defined as updated within the last 7 calendar days (`NOW() - 7 days`). "Recently Resolved" is defined as resolved within the last 30 calendar days (`NOW() - 30 days`).
4. **Follow-Up Note Requirement:** A checkbox `followUpRequired` controls the validation rule; frontend dynamically reveals and focuses the input when checked, and clears it on blur when unchecked per work norms.
