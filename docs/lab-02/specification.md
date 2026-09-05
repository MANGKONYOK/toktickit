# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a robust, responsive, and secure Requester-facing MVP ticketing experience for TokTickIT using the Zen Green design system. This sprint establishes a temporary Development Requester selection mechanism to simulate multi-user ownership before full authentication. By the end of this sprint, a Requester can select an active development identity, create support tickets with auto generated unique Ticket Numbers, search, filter, sort and paginate through their own tickets in My Tickets, view read only Ticket Details with strict cross-requester data isolation and manage attachment files through a governed soft-removal lifecycle.

---

## 2. Stakeholder Request
The IT department is ready to receive real support requests and requires a professional, responsive requester (end-user) ticketing portal. Requesters must be able to describe a problem, select its Category and Related System, indicate requested urgency, attach supporting files (JPG, PNG, WEBP, PDF <= 5MB, max 5 active), and submit the ticket. Upon submission, the backend generates an official unique Ticket Number (`TKT-YYYY-NNNNNN`). Requesters can view only their own tickets in a paginated list with search, category/priority/status filters, and column sorting. Requesters can open a read-only Ticket Detail view and manage attachments, including adding new files and soft-removing existing attachments with a mandatory audit reason, while permanently blocking downloads of removed files. Because a temporary Development Requester Selection screen is provided to simulate multi-user testing context.

---

## 3. Scope

### Included Scope
- **Development Requester Context:** Temporary selector loaded from active PostgreSQL seed users, persistent client testing session context, and navbar user switcher.
- **Create Ticket Workflow:** Validated creation form with dynamic Category and Related System dropdowns, Requested Priority, Summary, Description and initial attachment uploads.
- **Auto Ticket Numbering:** Transactionally generated unique sequential identifier formatted as `TKT-YYYY-NNNNNN`.
- **My Tickets Workflow:** Paginated list (table on desktop, cards on mobile) strictly filtered to the active Requester's tickets, with text search, multi-filter dropdowns, sorting, pagination, empty state and no-results state.
- **Requester Ticket Detail Workflow:** Read-only inspection of ticket header fields and description with strict backend ownership enforcement (returning 404 on cross-requester access).
- **Attachment Lifecycle:** Multi-file upload (JPG/PNG/WEBP/PDF $\le$ 5MB, max 5 active), secure download for active files, soft-removal with mandatory reason, audit metadata view and blocked download (404/410) for removed files.
- **Zen Green UI System:** Responsive design across Desktop ($\ge 992\text{px}$), Tablet ($768\text{px}-991\text{px}$), and Mobile ($< 768\text{px}$), field-level inline error messages, and loading/busy states.

### Explicitly Excluded Scope (Lab 2 Boundaries)
- Real authentication, passwords, password hashing, sessions, tokens, login/logout endpoints.
- IT Staff workflow (staff queue, ticket claiming, reassigning, editing IT priority, closing/resolving tickets).
- Ticket status transitions beyond the initial `New` status.
- Public Comments, Internal Notes, Actions Taken logs and Administrator management portals.

---

## 4. Functional Requirements
- **FR-01 (Requester Selection):** The system shall allow selecting any active Development Requester from PostgreSQL to establish the testing context. Inactive requesters must not appear in the selector.
- **FR-02 (Context Persistence & Switching):** The system shall display the active Requester in the header, persist the selection in client state/storage, and allow switching requesters, reloading all data for the new identity.
- **FR-03 (Reference Data Retrieval):** The system shall provide active Categories and Related Systems from PostgreSQL to populate form dropdowns.
- **FR-04 (Ticket Creation):** The system shall allow a Requester to submit a ticket with Category, Related System, Requested Priority, Summary, Description and optional attachments.
- **FR-05 (Automatic Ticket Numbering):** The system shall transactionally generate a unique, sequential Ticket Number matching `TKT-YYYY-NNNNNN` on ticket creation.
- **FR-06 (Requester Ticket Isolation):** The system shall restrict ticket listing and ticket detail queries strictly to the active Requester's owned tickets.
- **FR-07 (Search & Multi-Filter):** The system shall allow searching tickets by Ticket Number or Summary substring, combined with filtering by Category, Requested Priority, IT Priority and Status.
- **FR-08 (Sorting & Pagination):** The system shall support sorting by creation date, ticket number, summary, priority, and status and paginating results with configurable page sizes (default: 10).
- **FR-09 (UI State Feedback):** The system shall provide clear visual feedback for Initial Loading, Empty Queue (0 tickets), No Results (0 filter matches), Form Submitting Busy state and API Error states.
- **FR-10 (Read-Only Ticket Detail):** The system shall display all header fields and descriptions of an existing ticket in a non-editable, read-only layout (`#F0F4F1`).
- **FR-11 (Attachment Upload):** The system shall allow uploading permitted attachments ($\le 5\text{MB}$, JPG/PNG/WEBP/PDF) up to 5 active files per ticket.
- **FR-12 (Attachment Soft Removal & Audit):** The system shall allow soft-removing active attachments by providing a mandatory removal reason ($\ge 5$ chars), retaining metadata in an audit section and blocking binary downloads.

---

## 5. Business Rules
- **BR-01 (Unique Ticket Number):** The official Ticket Number is generated by the backend, must be unique, and follows the format `TKT-YYYY-NNNNNN` (`TKT-2026-000001`).
- **BR-02 (Initial Ticket Status):** A new Ticket begins with Current Status `New` (`NEW`).
- **BR-03 (Testing Context Disclaimer):** It uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.
- **BR-04 (Inactive Requester Exclusion):** Inactive Development Requesters (`isActive: false`) must never appear in the selector dropdown or create tickets.
- **BR-05 (Field Validation Constraints):**
  - **Category:** Required; must exist in database.
  - **Related System:** Required; must exist in database.
  - **Requested Priority:** Required; enum `LOW`, `MEDIUM`, `HIGH`, `URGENT` (Default: `MEDIUM`).
  - **Summary:** Required; length between 5 and 100 characters after trimming.
  - **Description:** Required; length between 10 and 2,000 characters after trimming.
- **BR-06 (Whitespace Trimming):** All text inputs (Summary, Description, Removal Reason) must be trimmed of leading and trailing whitespace before validation and storage.
- **BR-07 (Form Data Preservation):** If ticket submission fails due to validation or server errors, all entered form values and valid file selections must remain preserved in the form.
- **BR-08 (Strict Requester Ownership):** A Requester can only access and view their own tickets and attachments. Any request for another Requester's ticket or attachment must be rejected with HTTP `404 Not Found` (to avoid leaking resource existence).
- **BR-09 (Permitted Attachment Types & Size):** Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Maximum size: `5 MB` ($5,242,880$ bytes) per file.
- **BR-10 (Maximum Active Attachments):** A ticket may have at most five (5) active attachments at any given time. Uploading a 6th active file must return HTTP `409 Conflict`.
- **BR-11 (Mandatory Soft-Removal Reason):** Attachment removal requires a non-empty reason between 5 and 255 characters. Hard file deletion from the database is prohibited.
- **BR-12 (Download Blocking for Removed Attachments):** Any attempt to download or preview a soft-removed attachment (`removedAt` is not null) must be rejected with HTTP `404 Not Found` or `410 Gone`.
- **BR-13 (Query Defaults):** Default pagination is `page=1`, `limit=10`. Default sorting is `createdAt` descending (`desc`).
- **BR-14 (Duplicate Submission Prevention):** Submit buttons must enter a disabled busy state with a spinner during processing to prevent double submissions.
- **BR-15 (Attachment Transaction Safety):** When creating a ticket with attachments, ticket creation and file attachment records must be handled safely so that failed uploads do not corrupt ticket integrity.
- **BR-16 (Transition Readiness):** Data models must reference `requesterId` as a foreign key that cleanly migrates to the unified `User` model.

---

## 6. UI Specification Summary
- **Design Tokens (Zen Green):** Primary Green `#006B3C` (Header, primary buttons), Secondary Green `#0B7A46` (Active tabs, focus rings, links), Pale Green `#EAF6EF` (Selected rows, subtle badge backgrounds), Page Background `#F5F7F6`, Surface `#FFFFFF`, Primary Text `#1B2E24`, Read-Only Field Background `#F0F4F1`, Error `#C5221F`, Warning `#D97706`.
- **Responsive Layouts:**
  - **Desktop ($\ge 992\text{px}$):** Multi-column layout, centered `1200px` container, full data table with sortable column headers.
  - **Tablet ($768\text{px}-991\text{px}$):** Two-column form layouts, compact responsive table.
  - **Mobile ($< 768\text{px}$):** Single-column vertical stack, card-based ticket list, touch-friendly controls ($\ge 44\text{px}$ targets), zero horizontal scrolling.
- **Component Rules & States:** Red asterisk (`*`) on required labels, field-level error messages immediately beneath invalid inputs, button loading spinners in busy states, and read only inputs styled with shaded `#F0F4F1` backgrounds.

---

## 7. Data Changes

### 7.1. Prisma Schema & Models
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
  @@index([categoryId])
  @@index([currentStatus])
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

### 7.2. Database Design Decisions & Justifications (Labsheet §5.2)
1. **Unique Constraints:** `Ticket.ticketNumber`, `RequesterUser.email`, `Category.name` and `RelatedSystem.name` are enforced as `@unique` to guarantee business integrity at the database engine level.
2. **Justified Indexes:**
   - `Ticket(requesterId)`: Justified because every query in My Tickets and Ticket Detail filters strictly by `requesterId` for multi-user isolation.
   - `Ticket(createdAt)`: Justified because default sorting orders tickets by creation timestamp descending.
   - `Ticket(categoryId)` and `Ticket(currentStatus)`: Justified to accelerate multi-criteria filtering on high-volume queues.
   - `Attachment(ticketId)`: Justified because attachment lists and active-count validations always look up by `ticketId`.
3. **Soft-Removal Representation:** `Attachment` uses nullable audit columns (`removedAt`, `removedById`, `removalReason`). Active attachments are queried with `WHERE removedAt IS NULL`. Soft-removed attachments remain as immutable metadata for auditability while their binary access is blocked.
4. **Ticket Number Generation & Uniqueness:** Generated using a database sequence or atomic transactional calculation combining the four-digit year with a sequential number (e.g., `TKT-2026-000001`), enforced with a database unique index.
5. **Lab 3 Authentication Evolution:** The `RequesterUser` model is structured with standard identity fields (`id`, `fullName`, `email`, `department`) so that in Lab 3, it seamlessly evolves into a unified `User` model with `passwordHash`, `role` enum (`REQUESTER`, `IT_STAFF`, `ADMIN`), and session management without breaking `Ticket.requesterId` foreign keys.

### 7.3. Required Seed Data (Labsheet §5.3)
- **Categories (4):** `Account and Access`, `Hardware`, `Software`, `Network`.
- **Related Systems (7):** `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
- **Development Requesters (5):**
  - Active (4): *Sorawit Chaithong* (`Science`), *Piti Srisongkram* (`Engineering`), *John Doe* (`Finance`), *Jane Doe* (`Human Resources`).
  - Inactive (1): *Alexanders Aleisters (Inactive)* (`Operations`, `isActive: false`).

---

## 8. API Contract

The API implements all 10 required capabilities defined in Section 6 of the Labsheet:

| # | Endpoint | Method | Purpose | Key Params / Body | Status Codes |
| :-: | :--- | :---: | :--- | :--- | :--- |
| **1** | `/api/categories` | `GET` | Retrieve active categories | None | `200`, `500` |
| **2** | `/api/related-systems` | `GET` | Retrieve active related systems | None | `200`, `500` |
| **3** | `/api/requesters` | `GET` | Retrieve active development requesters | None | `200`, `500` |
| **4** | `/api/tickets` | `POST` | Create a validated ticket | Header: `x-requester-id` (authoritative) or JSON `{ requesterId, categoryId, relatedSystemId, summary, requestedPriority, description }` | `201`, `400`, `404`, `500` |
| **5** | `/api/tickets` | `GET` | Retrieve selected requester's tickets | Header: `x-requester-id` (authoritative) or Query: `requesterId`, `search`, `categoryId`, `requestedPriority`, `itPriority`, `status`, `sortBy`, `sortOrder`, `page`, `limit` | `200`, `400`, `404`, `500` |
| **6** | `/api/tickets/:id` | `GET` | Retrieve one owned ticket detail | Header: `x-requester-id` (authoritative) or Query: `requesterId` | `200`, `400`, `404`, `500` |
| **7** | `/api/tickets/:id/attachments` | `POST` | Upload an attachment | Header: `x-requester-id` (authoritative), Multipart: `file`, `requesterId` | `201`, `400`, `404`, `409`, `413`, `415`, `500` |
| **8** | `/api/tickets/:id/attachments` | `GET` | Retrieve attachment metadata list | Header: `x-requester-id` (authoritative) or Query: `requesterId` | `200`, `404`, `500` |
| **9** | `/api/attachments/:id/download`| `GET` | Download an active attachment | Header: `x-requester-id` (authoritative) or Query: `requesterId` | `200`, `404`, `410`, `500` |
| **10**| `/api/attachments/:id` | `DELETE`| Soft-remove an attachment with reason | Header: `x-requester-id` (authoritative) or JSON `{ requesterId, reason }` | `200`, `400`, `404`, `409`, `500` |

---

## 9. Acceptance Criteria (Given-When-Then)

- **AC-01 (Ticket Creation Success):** Given valid Ticket data and an active Requester, when the Requester submits the form, then one Ticket record is saved in PostgreSQL, the official Ticket Number (`TKT-YYYY-NNNNNN`) is generated, and a success confirmation is displayed.
- **AC-02 (Requester Context Gate):** Given no Development Requester is selected in local state, when the user navigates to `/tickets` or `/create-ticket`, then they are redirected to the Development Requester Selection screen.
- **AC-03 (Ownership Isolation - Direct Access):** Given Requester B is selected, when a Ticket or Attachment belonging to Requester A is requested via API or UI, then access is denied with HTTP 404 Not Found and no ticket data is exposed.
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
- **AC-14 (Attachment Upload Success):** Given a valid file ($\le 5\text{MB}$, JPG/PNG/WEBP/PDF) and less than 5 active attachments on the ticket, when uploaded, then the file is stored safely and appears in the active attachments list.
- **AC-15 (Reject Invalid Attachment Format & Size):** Given a file exceeding 5MB or with an unsupported extension (`.exe`, `.zip`), when upload is attempted, then the upload is rejected with a clear validation error.
- **AC-16 (Enforce Active Attachment Cap):** Given a ticket already containing 5 active attachments, when the user attempts to add a 6th attachment, then the action is blocked with HTTP 409 Conflict and a limit reached warning.
- **AC-17 (Soft Removal with Mandatory Reason):** Given an active attachment, when the owner confirms removal and enters a valid reason ($\ge 5$ characters), then the attachment is marked as removed (`removedAt` populated) and moves to the audit metadata list.
- **AC-18 (Blocked Download for Removed Attachments):** Given a soft-removed attachment, when a download request is issued, then the server rejects the request with HTTP 404 Not Found / 410 Gone.

---

## 10. Definition of Done (DoD)

### Part 1: Product Completion
- [x] All approved scope features implemented (Requester Context, Create Ticket, My Tickets, Detail, Attachments).
- [x] All 18 Acceptance Criteria (`AC-01` to `AC-18`) verified with passing automated tests across all 6 test levels.
- [x] Conforms strictly to data schema, API contract, and Zen Green visual specification.
- [x] No required tests skipped, commented out, or flaky.
- [x] Responsive design verified on Desktop ($\ge 992\text{px}$), Tablet ($768\text{px}-991\text{px}$), and Mobile ($< 768\text{px}$).

### Part 2: Course Delivery Requirements
- [x] Staging workflow followed (`main` $\rightarrow$ `lab2-staging` $\rightarrow$ feature branches $\rightarrow$ PR reviews $\rightarrow$ release PR).
- [x] GitHub project Kanban updated with all issues in `Done`.
- [x] All required documents in `docs/lab-02/` complete, accurate, and approved.
- [x] PDF submission compiled with Answer Parts 1 through 9.

---

## 11. Assumptions and Decisions (Labsheet §8.10 Section 11)

The following explicit engineering rulings govern the Lab 2 implementation:

1. **Ticket Number Format & Uniqueness:** Official Ticket Numbers follow `TKT-YYYY-NNNNNN` where `YYYY` is the current UTC year and `NNNNNN` is a zero-padded 6-digit sequence. Uniqueness is guaranteed by generating the identifier inside a database transaction and enforcing a PostgreSQL `@unique` index on `Ticket.ticketNumber`.
2. **Attachment Storage Strategy:** In Lab 2, attachment binaries are stored in a dedicated server storage directory (`server/uploads/attachments/`) using server-generated randomized identifiers (`${Date.now()}-${random}${ext}`) rather than raw user-supplied filenames, strictly preventing filesystem path traversal, directory collisions, and unicode filename attacks. The user's original filename (`originalName`), MIME type, file size, and soft-removal audit fields reside securely in PostgreSQL (`Attachment` model).
3. **Create-then-Upload Atomicity & Compensation:** Initial ticket creation creates the `Ticket` database record first. If an optional initial attachment upload fails, the server reports the upload error while keeping the ticket intact, enabling the user to retry attachment uploads from Ticket Detail without creating duplicate tickets.
4. **Development Requester Session Location:** The selected Development Requester identity lives in client-side state (`React Context` backed by `localStorage`) and is transmitted to the backend primarily via the `x-requester-id` HTTP request header, which takes strict precedence over query strings and request bodies to prevent tenant spoofing. Fallback query parameters are supported for browser download links (`<a href>`), and fallback body fields are supported for backwards compatibility.
5. **Enums vs. Reference Tables:** 
   - `Category` and `RelatedSystem` are implemented as database **Reference Tables** (`Category`, `RelatedSystem`) to allow dynamic database administration and foreign key integrity.
   - `Priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and `TicketStatus` (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`) are implemented as **Prisma Enums** to enforce strict type-safe state transitions across the application.
6. **IT Priority & Ticket Owner Scope:** In Lab 2, `itPriority` is initialized to match `requestedPriority` (or default `MEDIUM`), and `ticketOwner` defaults to `"Unassigned"`. These fields are displayed as read-only on the Requester Ticket Detail screen. Editing IT Priority and assigning Ticket Owners belong to the IT Staff workflow and are strictly deferred to future labs.