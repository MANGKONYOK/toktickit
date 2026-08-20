# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver the end-user (Requester) ticketing minimum viable product (MVP) with a complete Zen Green responsive UI foundation for TokTickIT. This release introduces a Development Requester identity selector to model multi-user ownership before full authentication in Sprint 3, enables end-users to create validated IT support tickets with auto-generated ticket numbers (`TKT-YYYY-NNNNNN`), provides a paginated My Tickets list with search, filtering and sorting, delivers a read-only Ticket Detail view with strict ownership enforcement and establishes a secure attachment lifecycle with governed soft-removal and auditability.

---

## 2. Stakeholder Request Interpretation
The IT department requires a professional web portal for employees to submit and track support requests. To simulate multi-user data isolation before Sprint 3 introduces real authentication, Sprint 2 uses a temporary Development Requester selection mechanism. A Requester can categorize problems, select affected corporate systems, set requested urgency, provide summaries and detailed descriptions, and upload up to 5 attachments (JPG, PNG, WEBP, PDF). The system transactionally generates an official unique Ticket Number, guarantees that Requesters can only access their own tickets and files, and enables soft-removing attachments with a mandatory audit reason.

---

## 3. Scope Boundaries & System Decisions

### System-Level Decisions Applied (from SDS-SYS-001)
- **D-01 (Product Spelling):** `TokTickIT`
- **D-02 (Status Vocabulary):** `New`, `Assigned`, `In Progress`, `Pending Requester`, `Resolved`, `Closed`, `Cancelled`. (Lab 2 tickets are initialized with `New`).
- **D-03 (Priority Vocabulary):** `Low`, `Medium`, `High`, `Urgent` (Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT` / `CRITICAL`).
- **D-06 & D-11 (Attachment Storage & Retention):** File binary stored locally with hashed storage key. PostgreSQL stores metadata. soft-removal retains metadata and marks `removedAt`/`removedById` while permanently blocking download.
- **D-09 & D-10 (Theme & Ticket Number):** Zen Green theme template, transactional Ticket Number format `TKT-YYYY-NNNNNN`.

### Included Scope (Lab 2)
- **Development Requester Context:** Simulated user selector populated from active seed users in PostgreSQL, persistent testing session context in React, dynamic active user switcher in the navigation bar.
- **Create Ticket Workflow:** Validated submission form with dynamic category and related system dropdowns, requested priority selection; summary and description validation, backend-generated ticket numbering.
- **My Tickets Workflow:** Paginated table/card view showing only tickets owned by the active Requester, search by keyword/ticket number, multi-criteria filtering (category, requested priority, IT priority, status), sorting, distinct empty and no-results states.
- **Requester Ticket Detail Workflow:** Read-only inspection of ticket metadata and details, strict backend ownership verification blocking cross-requester access.
- **Attachment Lifecycle:** Multi-file upload (JPG/JPEG, PNG, WEBP, PDF up to 5MB each, maximum 5 active files per ticket), secure download for active files, soft-removal with mandatory removal reason, retaining metadata in an audit view, download/preview blocking for soft-removed files.
- **Zen Green UI Foundation:** Responsive multi-viewport layouts (Desktop \ge 992\text{px}, Tablet 768\text{px}-991\text{px}, Mobile < 768\text{px}), field-level error messages, loading spinners, and distinct read-only styling.

### Excluded Scope (Strictly Prohibited for Lab 2)
- Real authentication, passwords, password hashing, JWT/session tokens, login/logout endpoints.
- IT Staff workflow (staff queue, ticket assignment/claiming, changing IT priority, closing/resolving tickets).
- Ticket status progression beyond the initial `New` status.
- Public Comments, Internal Notes, Actions Taken logs and Administrator portals.

---

## 4. Functional Requirements (FR)

- **FR-01 (Requester Selection):** The system shall allow selecting any active Development Requester from the database to establish the testing context. Inactive requesters must be excluded from selection.
- **FR-02 (Context Persistence & Switching):** The system shall maintain the selected Requester identity across navigation and provide a "Change Requester" action that immediately reloads data for the new identity.
- **FR-03 (Reference Data Retrieval):** The system shall provide active Categories and Related Systems from PostgreSQL to populate form selection controls.
- **FR-04 (Ticket Creation):** The system shall allow a Requester to submit a ticket specifying Category, Related System, Requested Priority, Summary, Description and optional initial attachments.
- **FR-05 (Automatic Ticket Numbering):** The system shall automatically generate a unique, sequential Ticket Number matching `TKT-YYYY-NNNNNN` upon ticket creation.
- **FR-06 (Requester Ticket Isolation):** The system shall restrict ticket listing and ticket detail queries strictly to the active Requester's owned tickets.
- **FR-07 (Search & Filtering):** The system shall allow searching tickets by Ticket Number or Summary substring, combined with filtering by Category, Requested Priority, IT Priority and Status.
- **FR-08 (Sorting & Pagination):** The system shall support sorting by creation date, ticket number, summary, priority, and status and paginating results with configurable page sizes (default: 10).
- **FR-09 (UI State Feedback):** The system shall provide clear visual feedback for Initial Loading, Empty Queue (0 tickets), No Results (0 filter matches), Form Busy/Submitting and API Error states.
- **FR-10 (Read-Only Ticket Detail):** The system shall display all header fields and descriptions of an existing ticket in a non-editable, read-only layout.
- **FR-11 (Attachment Upload):** The system shall allow uploading supported attachments (\le 5\text{MB}, JPG/PNG/WEBP/PDF) up to 5 active files per ticket.
- **FR-12 (Attachment Soft Removal & Audit):** The system shall allow soft-removing active attachments by providing a mandatory removal reason, displaying removed files as metadata in an audit section and blocking binary downloads.

---

## 5. Business Rules (BR)

- **BR-01 (Ticket Number Format):** Official Ticket Numbers must follow the format `TKT-YYYY-NNNNNN` (`TKT-2026-000001`), generated transactionally on creation.
- **BR-02 (Initial Ticket Status):** All newly created tickets are automatically assigned status `New` (`NEW`).
- **BR-03 (Testing Context Labeling):** The Requester Selector must be explicitly labeled as a testing mechanism for Lab 2 multi-user simulation, not real authentication.
- **BR-04 (Active User Constraint):** Inactive Development Requesters (`isActive: false`) must never appear in the selector dropdown or be allowed to create tickets.
- **BR-05 (Field Validation Constraints):**
  - **Category:** Required must exist in the database.
  - **Related System:** Required must exist in the database.
  - **Requested Priority:** Required must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Default: `MEDIUM`.
  - **Summary:** Required; length between 5 and 100 characters after trimming.
  - **Description:** Required length between 10 and 2,000 characters after trimming.
- **BR-06 (Whitespace Trimming):** All text inputs (Summary, Description, Removal Reason) must be trimmed of leading and trailing whitespace before validation and persistence.
- **BR-07 (Form Data Preservation on Error):** If ticket submission fails due to validation or server errors, all entered form values and non-faulty file selections must be preserved.
- **BR-08 (Strict Ownership Enforcement):** A Requester is strictly forbidden from querying, viewing, downloading attachments from, or modifying tickets belonging to another Requester. Unauthorized requests must return HTTP `403 Forbidden` (or `404 Not Found`).
- **BR-09 (Permitted Attachment Types & Size):** Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Maximum file size: `5 MB` (5,242,880 bytes) per file.
- **BR-10 (Maximum Active Attachments):** A ticket may have at most five (5) active attachments at any given time.
- **BR-11 (Mandatory Soft-Removal Reason):** Attachment removal requires a non-empty reason between 5 and 255 characters. Hard file deletion from the database is forbidden.
- **BR-12 (Download Blocking for Removed Attachments):** Any attempt to download or preview a soft-removed attachment (`removedAt` is not null) must be rejected with HTTP `410 Gone` or `404 Not Found`.
- **BR-13 (Query Defaults):** Default pagination is `page=1`, `limit=10`. Default sort order is `createdAt` descending (`desc`).
- **BR-14 (Duplicate Submission Prevention):** Submit buttons must enter a disabled busy state with a spinner upon click to prevent duplicate submissions.
- **BR-15 (Attachment Transaction Safety):** If attachment upload fails during initial ticket creation, the system must clearly notify the user while preserving the ticket and allowing re-upload.
- **BR-16 (Lab 3 Transition Readiness):** Data models must reference `requesterId` as a foreign key that will map directly to the unified `User` model in Lab 3.

---

## 6. Non-Functional Requirements (NFR)

- **NFR-01 (Responsiveness):** The UI layout must adapt seamlessly to Desktop (\ge 992\text{px}), Tablet (768\text{px}-991\text{px}), and Mobile (< 768\text{px}) with zero horizontal scroll.
- **NFR-02 (Accessibility & Contrast):** All text, inputs, buttons, and badges must satisfy WCAG 2.2 Level AA contrast requirements (\ge 4.5:1$ for normal text).
- **NFR-03 (Performance):** CRUD API responses for ticket creation and listing must respond within 500\text{ms} under normal test conditions.
- **NFR-04 (Data Integrity & Concurrency):** Unique Ticket Numbers must be generated transactionally to prevent duplicate numbering under concurrent requests.
- **NFR-05 (Graceful Error Handling):** The backend must return structured JSON error envelopes with machine-readable error codes and safe messages.

---

## 7. Data Changes (PostgreSQL & Prisma)

### Enums
```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  ASSIGNED
  IN_PROGRESS
  PENDING_REQUESTER
  RESOLVED
  CLOSED
  CANCELLED
}
```

### Models
```prisma
model RequesterUser {
  id         Int      @id @default(autoincrement())
  fullName   String
  email      String   @unique
  department String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  tickets    Ticket[]
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model RelatedSystem {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  tickets     Ticket[]
}

model Ticket {
  id                Int          @id @default(autoincrement())
  ticketNumber      String       @unique
  requesterId       Int
  requester         RequesterUser @relation(fields: [requesterId], references: [id])
  categoryId        Int
  category          Category     @relation(fields: [categoryId], references: [id])
  relatedSystemId   Int
  relatedSystem     RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  requestedPriority Priority     @default(MEDIUM)
  itPriority        Priority     @default(MEDIUM)
  currentStatus     TicketStatus @default(NEW)
  summary           String
  description       String
  ticketOwner       String?      @default("Unassigned")
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  attachments       Attachment[]

  @@index([requesterId])
  @@index([createdAt])
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

  @@index([ticketId])
}
```

### Seed Data
- **Categories (4):** `Account and Access`, `Hardware`, `Software`, `Network`.
- **Related Systems (7):** `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
- **Development Requesters (5):**
  - Active (4): *Sorawit Chaithong* (`Science`), *Piti Srisongkram* (`Engineering`), *John Doe* (`Finance`), *Jane Doe* (`Human Resources`).
  - Inactive (1): *Alexanders Aleisters (Inactive)* (`Operations`, `isActive: false`).

---

## 8. REST API Contract Summary

| Endpoint | Method | Purpose | Key Parameters / Payload | Status Codes |
| :--- | :---: | :--- | :--- | :--- |
| `/api/requesters` | `GET` | List active requesters | None | `200`, `500` |
| `/api/categories` | `GET` | List active categories | None | `200`, `500` |
| `/api/related-systems` | `GET` | List active related systems | None | `200`, `500` |
| `/api/tickets` | `POST` | Create a new ticket | JSON `{ requesterId, categoryId, relatedSystemId, summary, requestedPriority, description }` | `201`, `400`, `404`, `500` |
| `/api/tickets` | `GET` | List requester's tickets | Query: `requesterId`, `search`, `categoryId`, `requestedPriority`, `itPriority`, `status`, `sortBy`, `sortOrder`, `page`, `limit` | `200`, `400`, `500` |
| `/api/tickets/:id` | `GET` | Get ticket detail & attachments | Query: `requesterId` | `200`, `403`, `404`, `500` |
| `/api/tickets/:id/attachments` | `POST` | Upload attachment | Multipart: `file`, `requesterId` | `201`, `400`, `403`, `413`, `415`, `500` |
| `/api/attachments/:id/download` | `GET` | Download active file | Query: `requesterId` | `200`, `403`, `404`, `410` |
| `/api/attachments/:id` | `DELETE` | Soft-remove attachment | JSON `{ requesterId, reason }` | `200`, `400`, `403`, `404`, `409`, `500` |

---

## 9. Acceptance Criteria (Given-When-Then)

- **AC-01 (Ticket Creation Success):** Given valid Ticket data and an active Requester, when the Requester submits the form, then one Ticket record is saved in PostgreSQL, the official Ticket Number (`TKT-YYYY-NNNNNN`) is generated, and a success confirmation is displayed.
- **AC-02 (Requester Context Gate):** Given no Development Requester is selected in local state, when the user navigates to `/tickets` or `/create-ticket`, then they are redirected to the Development Requester Selection screen.
- **AC-03 (Ownership Isolation - Direct Access):** Given Requester B is selected, when a Ticket or Attachment belonging to Requester A is requested via API or UI, then access is denied with HTTP 403/404 and no ticket data is exposed.
- **AC-04 (Reference Data Availability):** Given the Create Ticket screen is loaded, when reference endpoints are queried, then all 4 active Categories and 7 Related Systems are populated into the select dropdowns.
- **AC-05 (Field Validation Feedback):** Given the Create Ticket form with empty or invalid fields (Summary < 5 chars, Description < 10 chars), when submitted, then submission is blocked and field-level error messages appear immediately below invalid controls.
- **AC-06 (Form Preservation on API Failure):** Given the user fills out the Create Ticket form, when the backend server is unreachable or returns a 500 error, then an error notification is shown and all entered inputs remain preserved in the form.
- **AC-07 (Ticket Search):** Given a keyword matching a ticket summary or ticket number, when entered in the My Tickets search box, then only matching tickets owned by the current Requester are returned.
- **AC-08 (Multi-Filter Combination):** Given category, priority, or status filters selected in My Tickets, when applied, then only tickets matching all selected criteria are displayed in the list.
- **AC-09 (Sorting Consistency):** Given a sort column (e.g., `createdAt`, `ticketNumber`, `summary`) and direction (`asc`/`desc`), when clicked, then the ticket list sorts accordingly while preserving active filters and pagination.
- **AC-10 (Pagination Mechanics):** Given a requester with 15 tickets, when viewing page 1 with limit 10, then 10 tickets are shown with a pagination bar indicating page 1 of 2, and clicking Next renders page 2 with the remaining 5 tickets.
- **AC-11 (Empty vs No-Results State):** Given a requester with 0 total tickets, when opening My Tickets, then an "Empty Ticket Queue" callout with a "+ Create Ticket" action is rendered; given filters returning 0 matches on an existing queue, a "No Matching Tickets Found" state with "Clear Filters" is rendered.
- **AC-12 (Requester Identity Switching):** Given Requester A is active and viewing their tickets, when switching to Requester B via the header menu, then the UI updates immediately to show only Requester B's tickets.
- **AC-13 (Read-Only Ticket Detail):** Given an owned Ticket Detail page is opened, when inspected, then Ticket Number, Dates, Requester, Category, Related System, Priorities, Status, Summary, and Description are displayed in non-editable read-only format (`#F0F4F1`).
- **AC-14 (Attachment Upload Success):** Given a valid file (\le 5\text{MB}, JPG/PNG/WEBP/PDF) and less than 5 active attachments on the ticket, when uploaded, then the file is stored safely and appears in the active attachments list.
- **AC-15 (Reject Invalid Attachment Format & Size):** Given a file exceeding 5MB or with an unsupported extension (`.exe`, `.zip`), when upload is attempted, then the upload is rejected with a clear validation error.
- **AC-16 (Enforce Active Attachment Cap):** Given a ticket already containing 5 active attachments, when the user attempts to add a 6th attachment, then the action is blocked with a limit reached warning.
- **AC-17 (Soft Removal with Mandatory Reason):** Given an active attachment, when the owner confirms removal and enters a valid reason ($\ge 5$ characters), then the attachment is marked as removed (`removedAt` populated) and moves to the audit metadata list.
- **AC-18 (Blocked Download for Removed Attachments):** Given a soft-removed attachment, when a download request is issued, then the server rejects the request with HTTP 410 Gone / 404 Not Found.

---

## 10. Definition of Done (DoD)

### Part 1: Product Completion
- [ ] All approved scope features implemented (Requester Context, Create Ticket, My Tickets, Detail, Attachments).
- [ ] All 18 Acceptance Criteria (`AC-01` to `AC-18`) verified with passing automated tests.
- [ ] Conforms strictly to data schema, API contract, and Zen Green visual specification.
- [ ] No required tests skipped, commented out, or flaky.
- [ ] Responsive design verified on Desktop (>= 992px), Tablet (768px - 991px), and Mobile (< 768px).

### Part 2: Course Delivery Requirements
- [ ] Staging workflow followed (`main` -> `lab2-staging` -> feature branches -> PR reviews -> release PR).
- [ ] GitHub project Kanban updated with all issues in `Done`.
- [ ] All required documents in `docs/lab-02/` complete and accurate.
- [ ] PDF submission compiled with Answer Parts 1 through 9.

---

## 11. Assumptions and Architecture Decisions
1. **Inherited System Baseline:** Inherits and enforces system decisions D-01 through D-12 from `SDS-SYS-001`.
2. **Ticket Number Sequence:** Implemented using PostgreSQL sequence or transactional count calculation formatted as `TKT-YYYY-NNNNNN`.
3. **Local Storage Adapter:** File binaries are stored locally in `server/uploads/` with UUID prefixes, while PostgreSQL maintains all audit metadata (`originalName`, `mimeType`, `fileSize`, `removedAt`, `removalReason`).
4. **Simulated Context Header / Query:** Identity is communicated via `requesterId` parameter or `x-requester-id` header to cleanly separate testing context from Lab 3 token-based authentication.