# Lab 3 Sprint Engineering Specification

## TokTickIT — Users, Roles, IT Staff Ticketing, and Admin Screens

---

## 1. Sprint Goal

Deliver the enterprise-grade foundation for TokTickIT (CPE 334 Lab 3) by replacing the temporary Lab 2 Development Requester selection mechanism with real credential-based authentication, server-side Role-Based Access Control (RBAC) across three distinct roles (`REQUESTER`, `IT_STAFF`, `ADMIN`), an operational IT Staff ticket queue and detail management workflow with 8 governed status transitions, private Internal Notes, and a minimalist Administrator user management interface with robust safety guardrails—all while preserving 100% of Lab 2 Requester self-service capabilities and adhering strictly to the Zen Green design system.

---

## 2. Stakeholder Request Interpretation

The IT Department requires TokTickIT to transition from an isolated requester prototype into an operational multi-role service desk application:

1. **Security & Identity:** Real authentication with secure password hashing must replace simulated identity selection. Users must be forced to change their initial password upon first login (`mustChangePassword: true`). Accounts flagged as inactive (`isActive: false`) must be blocked from logging in without leaking account existence.
2. **Requester Continuity & Feedback:** Requesters must retain all ticket creation, attachment, and viewing capabilities from Lab 2 under their verified identity. Requesters must additionally be able to post Public Comments on their tickets and indicate that a reported problem appears resolved.
3. **IT Staff Operational Workflow:** IT Staff members need a shared operational Ticket Queue with search, multi-criteria filtering (Category, Priority, Status, Assignment), deterministic multi-column sorting, and pagination. In Ticket Detail, IT Staff must be able to claim or reassign ticket ownership, override IT Priority, advance tickets through 8 governed status transitions, participate in Public Comments, and record private Internal Notes strictly concealed from Requesters.
4. **Administrator User Management:** Administrators require a minimalist user administration screen to inspect the user list, search by name or email, filter by role, create new users with initial passwords, edit basic profile attributes, toggle activation, and reset passwords. The system must enforce safety guardrails: preventing administrators from deactivating themselves and preventing the removal or role-demotion of the last active administrator.

---

## 3. Scope Boundaries

### 3.1. Included Scope

- **Real Authentication:** Credential validation (`email` and `password`), secure password hashing via `bcrypt`, session/token generation, current user endpoint (`GET /api/auth/me`), and logout.
- **Mandatory Password Change:** Interception and enforcement of password change on first login when `mustChangePassword: true`.
- **Role-Based Access Control (RBAC):** Server-side authorization middleware enforcing permissions across three roles: `REQUESTER`, `IT_STAFF`, and `ADMIN`.
- **Requester Ticketing Regression:** Full preservation of Lab 2 ticket creation, validation, numbering (`TKT-YYYY-NNNNNN`), attachments lifecycle, and ticket queue under authenticated identity.
- **Public Comments Stream:** Public discussion thread on tickets accessible to Requesters, IT Staff, and Admins.
- **Requester Problem Resolved Indication:** Dedicated action for Requesters to indicate their issue appears resolved.
- **IT Staff Ticket Queue:** Global queue query API and responsive UI supporting keyword search, category/priority/status/assignment filters, sorting, and pagination.
- **IT Staff Ticket Detail Operations:** Ticket ownership claiming/reassigning, IT Priority modification, 8 permitted lifecycle status transitions, and private Internal Notes panel.
- **Minimalist Administrator User Management:** User list table, search, role filtering, user creation with initial password, user editing, password reset, and admin safety guardrails.
- **Zen Green Design System & Responsiveness:** Conformance across Desktop ($\ge 992\text{px}$), Tablet ($768\text{px}-991\text{px}$), and Mobile ($< 768\text{px}$).

### 3.2. Explicitly Excluded Scope (Do NOT Implement)

- Real SMTP email delivery, email verification, password reset emails, or magic links.
- Multi-Factor Authentication (MFA), OAuth2 / Social Login / SSO, or public self-registration.
- IT Staff "Actions Taken" formalized log (deferred to Lab 4).
- SLA countdown timers, auto-escalation engines, or automated reminder jobs.
- Hard deletion of user accounts from the database (soft deactivation only).
- Bulk user operations, CSV import/export, profile picture uploads, or multiple roles per user.

---

## 4. Functional Requirements (FR-01 through FR-15)

- **FR-01 (Authentication):** The system shall authenticate users using a valid email address and password, rejecting invalid credentials with HTTP 401 and inactive accounts with HTTP 403.
- **FR-02 (Mandatory Password Change):** The system shall intercept authenticated users having `mustChangePassword: true` and restrict navigation until a compliant new password is saved.
- **FR-03 (Session & Identity):** The system shall establish a secure authenticated session upon successful login, provide `GET /api/auth/me` for profile hydration, and terminate the session upon `POST /api/auth/logout`.
- **FR-04 (Role-Based Authorization):** The system shall enforce role-based route guards on both frontend navigation and backend API endpoints, returning HTTP 403 Forbidden on unauthorized requests.
- **FR-05 (Requester Regression):** The system shall associate created tickets and queries with the authenticated Requester's ID (`req.user.id`), eliminating all dependencies on the Lab 2 Development Requester selector.
- **FR-06 (Public Comments):** The system shall allow Requesters to post public comments on their own tickets, and IT Staff / Admins to post public comments on any ticket.
- **FR-07 (Problem Resolution Indication):** The system shall provide Requesters with an action on Ticket Detail to indicate that their issue appears resolved, updating ticket state and appending an audit record.
- **FR-08 (Staff Ticket Queue):** The system shall provide IT Staff and Administrators with a shared ticket queue displaying ticket number, date, requester name, category, system, priority, status, and assigned owner.
- **FR-09 (Queue Search, Filter & Pagination):** The system shall enable IT Staff to search the queue by ticket number or summary substring, filter by category, priority, status, and assignment (`all`, `unassigned`, `me`), sort columns, and navigate pages.
- **FR-10 (Staff Ticket Detail):** The system shall provide IT Staff and Admins with a detailed operational ticket view displaying ticket attributes, attachments, public comments, and private internal notes.
- **FR-11 (Ownership Claim & Reassignment):** The system shall allow IT Staff to claim unassigned tickets or reassign tickets to any active IT Staff member or Administrator.
- **FR-12 (IT Priority Management):** The system shall allow IT Staff and Administrators to modify the operational `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) independently of the requester's requested priority.
- **FR-13 (Status Lifecycle Transitions):** The system shall enforce governed state transitions across all 8 permitted ticket statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- **FR-14 (Private Internal Notes):** The system shall allow IT Staff and Administrators to post and view private Internal Notes on tickets, strictly rejecting any Requester access with HTTP 403 Forbidden.
- **FR-15 (Admin User Management & Safety):** The system shall allow Administrators to list, search, filter, create, edit, and reset passwords for users, while strictly preventing self-deactivation and deactivation of the last active Administrator.

---

## 5. Business Rules (BR-01 through BR-25)

### 5.1. Authentication & Security Rules

- **BR-01 (Three Mutually Exclusive Roles):** Every user account must possess exactly one role from the `Role` enum: `REQUESTER`, `IT_STAFF`, or `ADMIN`. Multi-role assignment is prohibited.
- **BR-02 (Password Complexity):** Passwords must be at least 8 characters in length and contain at least one uppercase letter (`A-Z`), one lowercase letter (`a-z`), one numeric digit (`0-9`), and one special symbol (`@$!%*?&#^_-`).
- **BR-03 (First-Login Password Change):** Users created with an initial password or whose password has been reset by an Admin must have `mustChangePassword = true`. All non-auth API endpoints and UI screens (except `POST /api/auth/change-password` and `POST /api/auth/logout`) are blocked until changed.
- **BR-04 (Inactive Account Blocking & Evaluation Order):** To prevent account enumeration, authentication must validate credentials (email match and bcrypt password verification) *before* inspecting account active status. If credentials do not match or the user does not exist, the API must return HTTP 401 Unauthorized (`INVALID_CREDENTIALS`). Only when credentials successfully match an account with `isActive = false` does the API return HTTP 403 Forbidden with `{ "code": "ACCOUNT_INACTIVE", "message": "This account is inactive. Contact an Administrator." }`.
- **BR-05 (Password Hashing):** Passwords must never be stored or logged in plaintext. Hashes must be generated using `bcrypt` with a work factor (salt rounds) of at least 10.
- **BR-06 (Session Authority):** User identity and role must be derived strictly from the verified server-side session / token (`req.user`). Client-provided identity headers (`x-requester-id`) are deprecated and ignored.

### 5.2. Requester Business Rules

- **BR-07 (Requester Ownership Seam):** A Requester can only view, create, or comment on tickets where `ticket.requesterId == req.user.id`. Querying or accessing another user's ticket must return HTTP 404 Not Found to prevent ticket enumeration.
- **BR-08 (Public Comment Validation):** Public comments must be between 1 and 2,000 characters. Blank or whitespace-only comments are rejected.
- **BR-09 (Resolution Indication Constraint):** Requesters may indicate problem resolution only when a ticket is in `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER` status. Per BR-05 in the course labsheet, this action sets `resolvedByRequester = true` and records an automated comment, but does NOT formally transition ticket status to `RESOLVED`. Formal status resolution remains strictly governed by IT Staff.

### 5.3. IT Staff & Operational Rules

- **BR-10 (Staff Queue Access):** Users with role `IT_STAFF` or `ADMIN` can query the shared queue and view all tickets across all requesters. Users with role `REQUESTER` are denied access (HTTP 403 Forbidden).
- **BR-11 (Deterministic Queue Sorting):** Queue queries must support sorting by `createdAt`, `ticketNumber`, `summary`, `priority`, `status`, and `updatedAt` in `asc` or `desc` order, always appending secondary tie-breaker `id: "desc"`.
- **BR-12 (Ownership Assignment Validity):** Tickets may be assigned only to active users (`isActive = true`) whose role is `IT_STAFF` or `ADMIN`. Assigning to an inactive user or a `REQUESTER` is rejected with HTTP 400 Bad Request. Unassigned tickets have `ticketOwnerId = null`.
- **BR-13 (Operational IT Priority Authority):** The operational `itPriority` is initially seeded from the requester's `priority`. Only `IT_STAFF` and `ADMIN` roles may update `itPriority`.
- **BR-14 (Governed Status Transition Matrix):** Ticket status transitions must strictly follow the state transition graph:
  $$\begin{aligned}
  \text{NEW} &\longrightarrow \text{OPEN}, \text{CANCELLED} \\
  \text{OPEN} &\longrightarrow \text{IN\_PROGRESS}, \text{WAITING\_FOR\_REQUESTER}, \text{RESOLVED}, \text{CANCELLED} \\
  \text{IN\_PROGRESS} &\longrightarrow \text{WAITING\_FOR\_REQUESTER}, \text{RESOLVED}, \text{CANCELLED} \\
  \text{WAITING\_FOR\_REQUESTER} &\longrightarrow \text{IN\_PROGRESS}, \text{RESOLVED}, \text{CANCELLED} \\
  \text{RESOLVED} &\longrightarrow \text{CLOSED}, \text{REOPENED} \\
  \text{REOPENED} &\longrightarrow \text{IN\_PROGRESS}, \text{RESOLVED}, \text{CANCELLED} \\
  \text{CLOSED} &\longrightarrow \text{[Terminal State — No transitions]} \\
  \text{CANCELLED} &\longrightarrow \text{[Terminal State — No transitions]}
  \end{aligned}$$
  Any transition outside this matrix must be rejected with HTTP 400 Bad Request (`INVALID_STATUS_TRANSITION`).

- **BR-15 (Internal Notes Secrecy):** Internal notes are strictly internal to IT operations. Only `IT_STAFF` and `ADMIN` roles may create or read internal notes. Internal note records must never be returned in Requester API responses or UI views. Requesters attempting to access internal notes receive HTTP 403 Forbidden.

### 5.4. Administrator & Safety Rules

- **BR-16 (Admin Route Exclusivity):** All endpoints under `/api/admin/*` require the authenticated user to have `role = ADMIN`. Any other role receives HTTP 403 Forbidden.
- **BR-17 (Unique Email Enforcement):** User email addresses must be unique in the system (case-insensitive). Duplicate creation or editing is rejected with HTTP 409 Conflict.
- **BR-18 (Admin Self-Deactivation Prevention):** An Administrator cannot deactivate their own active account (`userId == req.user.id && isActive == false`). The request must be rejected with HTTP 400 Bad Request (`CANNOT_DEACTIVATE_SELF`).
- **BR-19 (Protection of Last Active Administrator):** The system must reject any deactivation or role change that would leave zero active Administrators in the database (`COUNT(User WHERE role='ADMIN' AND isActive=true) < 1`). The request must be rejected with HTTP 400 Bad Request (`LAST_ADMIN_PROTECTED`).
- **BR-20 (Admin Password Reset):** When an Administrator resets a user's password, the user's `mustChangePassword` flag is set to `true`.
- **BR-21 (Prohibition of Hard Deletion):** User deletion endpoints are prohibited. Account deactivation (`isActive = false`) must be used exclusively to preserve audit trails and referential integrity.
- **BR-22 (Safe Error Envelopes):** Database query errors, syntax errors, and internal server exceptions must never leak SQL queries, schema metadata, or stack traces. The server must return `{ "error": { "code": "INTERNAL_SERVER_ERROR", "message": "...", "correlationId": "<UUID>" } }`.
- **BR-23 (Audit Attribution):** Every comment, note, and ticket modification must record the authenticated `authorId` or `updatedAt` timestamp derived from the server session.
- **BR-24 (Attachment Authorization Continuity):** Attachment uploads, downloads, and soft-removals must maintain Lab 2 constraints while enforcing that Requesters can only access attachments on their own tickets, whereas IT Staff and Admins can access attachments across all tickets.
- **BR-25 (Pagination Bounds):** Pagination parameters are constrained to `page >= 1` (default 1) and `pageSize` in `[10, 20, 50]` (default 10). Out-of-bounds parameters default gracefully or return structured 400 errors.

---

## 6. RBAC Authorization Matrix

| Capability / Resource | Unauthenticated | `REQUESTER` | `IT_STAFF` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: |
| **Login / Logout** | Allowed (`login`) | Allowed | Allowed | Allowed |
| **Change Own Password** | Denied (401) | Allowed | Allowed | Allowed |
| **View Own Tickets (My Tickets)** | Denied (401) | Allowed (Owned only) | Allowed | Allowed |
| **Create Ticket** | Denied (401) | Allowed | Allowed | Allowed |
| **Manage Own Attachments** | Denied (401) | Allowed (Owned only) | Allowed | Allowed |
| **Post Public Comments** | Denied (401) | Allowed (Owned only) | Allowed (Any ticket) | Allowed (Any ticket) |
| **Indicate Problem Resolved** | Denied (401) | Allowed (Owned only) | Denied (403) | Denied (403) |
| **View IT Staff Queue** | Denied (401) | **Denied (403)** | Allowed | Allowed |
| **Claim / Reassign Ticket Owner** | Denied (401) | **Denied (403)** | Allowed | Allowed |
| **Modify IT Priority** | Denied (401) | **Denied (403)** | Allowed | Allowed |
| **Update Ticket Status (8 transitions)** | Denied (401) | **Denied (403)** | Allowed | Allowed |
| **Read / Post Internal Notes** | Denied (401) | **Denied (403)** | Allowed | Allowed |
| **List / Search Users** | Denied (401) | **Denied (403)** | **Denied (403)** | Allowed |
| **Create User** | Denied (401) | **Denied (403)** | **Denied (403)** | Allowed |
| **Edit User / Role / Active State** | Denied (401) | **Denied (403)** | **Denied (403)** | Allowed |
| **Reset User Password** | Denied (401) | **Denied (403)** | **Denied (403)** | Allowed |

---

## 7. UI Summary & Zen Green Layout

### 7.1. Color Tokens & Visual Hierarchy

- **Primary Green:** `#006B3C` (Navbar, primary CTA buttons, high-priority emphasis)
- **Secondary Green:** `#0B7A46` (Active navigation tabs, hover states, keyboard focus outline)
- **Light Tint:** `#EAF6EF` (Success alert banners, active status chips, selected table rows)
- **Read-Only Neutral:** `#F0F4F1` (Non-editable form inputs, shaded detail cards)
- **Danger / Destructive:** `#C5221F` (Error alerts, validation messages, destructive actions)
- **Internal Note Confidential Shading:** `#FFF8E1` (Warm amber card background with `#FFE082` border, clearly distinguishing private notes from public comments)
- **Page Background:** `#F5F7F6` | **Body Text:** `#1B2E24`

### 7.2. Shell Navigation by Role

- **Unauthenticated:** Brand logo, title "TokTickIT", and "Sign In" button.
- **`REQUESTER`:** "My Tickets", "Create Ticket", active user profile pill, and "Logout" button.
- **`IT_STAFF`:** "Ticket Queue", active user profile pill with `[IT Staff]` badge, and "Logout" button.
- **`ADMIN`:** "Ticket Queue", "User Management", active user profile pill with `[Admin]` badge, and "Logout" button.

### 7.3. Responsive Layout Guidelines

- **Desktop ($\ge 992\text{px}$):** Multi-column data tables, side-by-side grouped detail cards, full drawer forms.
- **Tablet ($768\text{px}-991\text{px}$):** 2-column compact grid, collapsible filter toolbar, table container with touch scrolling.
- **Mobile ($< 768\text{px}$):** Stacked cards representation, full-width touch targets ($\ge 44\text{px}$), hidden secondary columns, zero horizontal overflow.

---

## 8. Data Architecture & Schema Evolution

### 8.1. Prisma Models (`server/prisma/schema.prisma`)

```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMIN
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                 Int            @id @default(autoincrement())
  fullName           String
  email              String         @unique
  passwordHash       String
  role               Role           @default(REQUESTER)
  isActive           Boolean        @default(true)
  mustChangePassword Boolean        @default(true)
  department         String?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  createdTickets     Ticket[]       @relation("RequesterTickets")
  assignedTickets    Ticket[]       @relation("AssignedStaffTickets")
  uploadedAttachments Attachment[]  @relation("AttachmentUploader")
  removedAttachments  Attachment[]  @relation("AttachmentRemover")
  comments           Comment[]
  internalNotes      InternalNote[]

  @@index([role, isActive])
  @@index([email])
}

model Ticket {
  id                   Int            @id @default(autoincrement())
  ticketNumber         String         @unique
  summary              String
  description          String
  priority             Priority       @default(MEDIUM)
  itPriority           Priority       @default(MEDIUM)
  status               TicketStatus   @default(NEW)
  requesterId          Int
  ticketOwnerId        Int?
  categoryId           Int
  relatedSystemId      Int?
  resolvedByRequester  Boolean        @default(false)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  requester            User           @relation("RequesterTickets", fields: [requesterId], references: [id])
  ticketOwner          User?          @relation("AssignedStaffTickets", fields: [ticketOwnerId], references: [id])
  category             Category       @relation(fields: [categoryId], references: [id])
  relatedSystem        RelatedSystem? @relation(fields: [relatedSystemId], references: [id])
  attachments          Attachment[]
  comments             Comment[]
  internalNotes        InternalNote[]

  @@index([requesterId, createdAt(sort: Desc)])
  @@index([status, itPriority])
  @@index([ticketOwnerId])
}

model Attachment {
  id             Int       @id @default(autoincrement())
  ticketId       Int
  ticket         Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  fileName       String
  originalName   String
  mimeType       String
  fileSize       Int
  filePath       String
  uploadedById   Int
  uploadedAt     DateTime  @default(now())
  removedAt      DateTime?
  removedById    Int?
  removalReason  String?

  uploadedBy     User      @relation("AttachmentUploader", fields: [uploadedById], references: [id])
  removedBy      User?     @relation("AttachmentRemover", fields: [removedById], references: [id])

  @@index([ticketId])
  @@index([ticketId, removedAt])
}

model Comment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId, createdAt(sort: Asc)])
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId, createdAt(sort: Asc)])
}
```

*Note on `itPriority`:* When a ticket is created, the system dynamically initializes `itPriority` to match the requester's chosen `priority` (conforming to BR-13). The `@default(MEDIUM)` in Prisma serves solely as a database fallback.

### 8.2. Lab 2 Requester Migration Strategy (§5.2)

To evolve the Lab 2 database into the Lab 3 multi-role architecture without data loss:
- **Table Evolution:** Existing `RequesterUser` records are migrated into `User` with `role = REQUESTER`.
- **Initial Password Provisioning:** Migrated requesters receive the default initial password hash of `Password@2026` (`bcrypt`, 10 salt rounds) with `mustChangePassword = true`, requiring them to set a new password on their first login.
- **Relational Integrity:** Foreign keys on existing `Ticket` (`requesterId`) and `Attachment` (`uploadedById`, `removedById`) records are retargeted from `RequesterUser` to `User`.
- **Reference Tables:** Existing `Category` and `RelatedSystem` reference tables remain untouched.

### 8.3. Seed Data Architecture (`server/prisma/seed.ts`)

Default initial password: `Password@2026` (hashed with `bcrypt`, work factor 10).

The seed provisions **13 accounts** (10 Active, 3 Inactive). The first 5 accounts maintain strict 1:1 ID and sequence alignment with Lab 2's `RequesterUser` table (Sorawit, Piti, John Doe, Jane Doe, Alexanders), followed by Lab 3 specialized role test accounts:

- **Requesters (6 Active, 2 Inactive):**
  1. `sorawit.chaithong@email.com` (`mustChangePassword: false`, Active — ID 1, Lab 2 & Lab 3 primary requester)
  2. `john.doe@email.com` (`mustChangePassword: false`, Active — ID 3, Lab 2 ownership isolation tests)
  3. `jane.doe@email.com` (`mustChangePassword: false`, Active — ID 4, Lab 2 & Lab 3 requester)
  4. `alexanders.aleisters@email.com` (`isActive: false`, Inactive — ID 5, Lab 2 inactive requester)
  5. `alexanders.inactive@email.com` (`isActive: false`, Inactive — Lab 3 login rejection test)
  6. `bob.smith@email.com` (`mustChangePassword: true`, Active — Lab 3 first-login password change gate)
  7. `alice.johnson@email.com` (`mustChangePassword: false`, Active — Lab 3 requester scenario)
- **IT Staff (3 Active + 1 legacy alias, 1 Inactive):**
  1. `piti.srisongkram@gmail.com` (`mustChangePassword: false`, Active — ID 2, Lab 2 legacy alias)
  2. `piti.srisongkram@email.com` (`mustChangePassword: false`, Active — Lab 3 primary IT Staff)
  3. `somchai.it@email.com` (`mustChangePassword: false`, Active — Lab 3 IT Staff)
  4. `wichai.it@email.com` (`mustChangePassword: false`, Active — Lab 3 IT Staff)
  5. `charlie.it.inactive@email.com` (`isActive: false`, Inactive — Lab 3 inactive staff)
- **Administrator (1 Active):**
  1. `admin.toktickit@email.com` (`mustChangePassword: false`, Active — Lab 3 primary Administrator)

---

## 9. REST API Contract Summary

All endpoints return standard JSON envelopes. Protected endpoints require valid session / token.

### 9.1. Authentication APIs

- `POST /api/auth/login` — Validate credentials, verify active status, return user payload and establish session.
- `POST /api/auth/logout` — Clear session / cookie.
- `GET /api/auth/me` — Return authenticated user profile.
- `POST /api/auth/change-password` — Change password, validate complexity, clear `mustChangePassword`.

### 9.2. Requester APIs (Authenticated)

- `POST /api/tickets` — Create ticket attributed to `req.user.id`.
- `GET /api/tickets` — List owned tickets (`where: { requesterId: req.user.id }`).
- `GET /api/tickets/:id` — Retrieve owned ticket details.
- `POST /api/tickets/:id/comments` — Add public comment.
- `GET /api/tickets/:id/comments` — Retrieve public comments.
- `PATCH /api/tickets/:id/resolve-indication` — Indicate problem resolved.

### 9.3. IT Staff Queue & Operational APIs

- `GET /api/staff/tickets` — Query staff queue with search, category, priority, status, assigned, sort, page.
- `GET /api/staff/tickets/:id` — Retrieve full staff ticket detail, comments, and internal notes.
- `PATCH /api/staff/tickets/:id/assign` — Claim ownership or reassign to active staff.
- `PATCH /api/staff/tickets/:id/priority` — Update operational `itPriority`.
- `PATCH /api/staff/tickets/:id/status` — Transition status according to governed matrix.
- `POST /api/staff/tickets/:id/notes` — Create private internal note (role-gated: Staff/Admin only).

### 9.4. Administrator User Management APIs

- `GET /api/admin/users` — List users with search and role filter.
- `POST /api/admin/users` — Create user with initial password (`mustChangePassword = true`).
- `PATCH /api/admin/users/:id` — Edit user name, email, role, and active status (enforcing safety rules).
- `POST /api/admin/users/:id/reset-password` — Set new initial password requiring change at next login.

---

## 10. Acceptance Criteria (AC-01 through AC-22)

- **AC-01 (Valid Authentication):** Given a valid active user email and password, when `POST /api/auth/login` is executed, then the server returns HTTP 200 OK with the authenticated user profile and establishes a valid session.
- **AC-02 (Invalid Credentials Rejection):** Given invalid or mismatched credentials, when login is attempted, then the server returns HTTP 401 Unauthorized without disclosing whether the email exists.
- **AC-03 (Inactive Account Rejection):** Given an account with `isActive = false`, when valid credentials are submitted, then login is rejected with HTTP 403 Forbidden (`ACCOUNT_INACTIVE`).
- **AC-04 (Mandatory First Password Change Gate):** Given a user with `mustChangePassword = true`, when authenticated, then all non-password change application routes are intercepted until `POST /api/auth/change-password` succeeds.
- **AC-05 (Password Complexity Enforcement):** Given a new password that fails complexity rules (< 8 chars, missing uppercase, digit, or special symbol), when changing password, then the request is rejected with HTTP 400 Bad Request.
- **AC-06 (Logout Access Revocation):** Given an active session, when `POST /api/auth/logout` is called, then subsequent requests to protected endpoints return HTTP 401 Unauthorized.
- **AC-07 (Role-Based Route Protection):** Given an authenticated `REQUESTER`, when requesting `/api/staff/*` or `/api/admin/*`, then the server returns HTTP 403 Forbidden.
- **AC-08 (Requester Ticket Creation Attribution):** Given an authenticated Requester, when creating a ticket, then the ticket's `requesterId` strictly matches `req.user.id` regardless of any body or query parameters.
- **AC-09 (Requester Ownership Isolation):** Given an authenticated Requester, when querying tickets, then only tickets belonging to that requester are returned; direct access to another user's ticket returns HTTP 404 Not Found.
- **AC-10 (Public Comments Stream):** Given a ticket, when a Requester, IT Staff, or Admin submits a valid public comment, then it is persisted and visible to all authorized viewers of that ticket.
- **AC-11 (Requester Problem Resolved Indication):** Given an open ticket, when the Requester clicks "Problem Appears Resolved", then the system records `resolvedByRequester = true` and appends an audit entry, while preserving the active ticket status (does NOT change status to `RESOLVED` per BR-05; formal status change remains reserved for IT Staff).
- **AC-12 (Staff Queue Query & Search):** Given IT Staff credentials, when querying `GET /api/staff/tickets?search=VPN`, then all matching tickets across all requesters are returned with pagination metadata.
- **AC-13 (Staff Queue Multi-Criteria Filters):** Given active filters for category, priority, and status, when querying the staff queue, then results strictly conform to the intersection of all selected filters.
- **AC-14 (Staff Queue Assignment Filtering):** Given the `assigned` query parameter (`unassigned`, `me`, or `all`), when queried, then tickets are filtered accurately based on `ticketOwnerId`.
- **AC-15 (Staff Ticket Detail Retrieval):** Given an IT Staff user, when opening `GET /api/staff/tickets/:id`, then complete ticket metadata, attachments, comments, and internal notes are returned.
- **AC-16 (Ownership Claim & Reassignment):** Given an IT Staff user, when claiming a ticket (`ticketOwnerId = req.user.id`) or reassigning to another active staff member, then the ownership is updated and persisted.
- **AC-17 (Operational IT Priority Modification):** Given an IT Staff user, when updating `itPriority` to `URGENT`, then the change is persisted independently of the requester's requested priority.
- **AC-18 (Governed Status Transition Validation):** Given a ticket in `NEW` status, when transitioning to `IN_PROGRESS`, then the request is rejected with HTTP 400 (`INVALID_STATUS_TRANSITION`) because `NEW` may only transition to `OPEN` or `CANCELLED`.
- **AC-19 (Internal Notes Secrecy Enforcement):** Given an authenticated `REQUESTER`, when attempting `POST /api/staff/tickets/:id/notes` or viewing ticket details, then internal notes are never returned and note creation returns HTTP 403 Forbidden.
- **AC-20 (Admin User Creation & Validation):** Given an Administrator, when creating a user with valid email, name, role, and initial password, then the user is persisted with `mustChangePassword = true`.
- **AC-21 (Admin Self-Deactivation Prevention):** Given an Administrator, when submitting a request to deactivate their own account, then the request is rejected with HTTP 400 Bad Request (`CANNOT_DEACTIVATE_SELF`).
- **AC-22 (Last Active Admin Protection):** Given a database with only 1 active Administrator, when submitting a request to deactivate or change the role of that administrator, then the request is rejected with HTTP 400 Bad Request (`LAST_ADMIN_PROTECTED`).

---

## 11. Product Definition of Done (DoD) & Technical Decisions

### 11.1. Definition of Done Checklist

- [ ] All 15 Functional Requirements (FR-01..15) and 25 Business Rules (BR-01..25) are satisfied.
- [ ] All 22 Acceptance Criteria (AC-01..22) are mapped to automated tests with 100% pass status.
- [ ] All existing Lab 2 Requester capabilities pass regression testing under authenticated identity.
- [ ] Password hashing uses `bcrypt` with salt rounds $\ge 10$; plaintext passwords never stored.
- [ ] Server catch blocks redact internal database errors and return safe HTTP 500 envelopes with UUID `correlationId`.
- [ ] Role-Based Access Control is enforced server-side via Express middleware, returning HTTP 403.
- [ ] Internal Notes are verified 100% confidential and inaccessible to Requesters.
- [ ] Administrator safety guardrails (self-deactivation and last-admin protection) are verified by automated tests.
- [ ] Zen Green design tokens and responsive layouts ($\ge 992\text{px}$, $768\text{px}-991\text{px}$, $< 768\text{px}$) are upheld with zero horizontal overflow.
- [ ] Playwright multi-viewport automated E2E suites pass across Desktop, Tablet, and Mobile viewports.

### 11.2. Key Technical Decisions

- **Session vs. JWT:** We employ signed HTTP-only cookies storing a verified session token containing `{ userId, role }`. HTTP-only cookies prevent Cross-Site Scripting (XSS) credential theft while eliminating manual header handling on the client.
- **Prisma Schema Migration Strategy:** Rather than a purely additive migration, Sprint 3 executes a structured schema evolution: evolving `RequesterUser` $\to$ `User`, updating foreign key references in `Ticket` (`requesterId`, `ticketOwnerId`) and `Attachment` (`uploadedById`, `removedById`), normalizing `currentStatus` $\to$ `status`, and adding `itPriority` and `resolvedByRequester`. Existing reference tables (`Category`, `RelatedSystem`) remain intact with zero data loss.
- **Internal Note Visual Contrast:** To eliminate human error in operational IT environments, Internal Notes are styled with an unmistakable warm amber card background (`#FFF8E1` with `#FFE082` border), prominently labeled "Confidential Internal Note — IT Staff & Admin Only".