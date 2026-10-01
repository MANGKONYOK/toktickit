# TokTickIT - IT Service Desk Web Application

TokTickIT is an enterprise IT service desk web application built to manage Account and Access, Hardware, Software, and Network support requests. This repository contains the complete **Sprint 3: Users, Roles, IT Staff Ticketing, and Admin Screens** release, demonstrating full-stack integration between a React UI, Express REST API, Prisma ORM, and PostgreSQL database.

---

## 🌟 Sprint 3 Features

### 1. Authentication Foundation & Session Management
- **Bcrypt Password Hashing:** Salt rounds $\ge 10$; plaintext passwords are never stored in the database.
- **Anti-Enumeration Defense:** Backend verifies the password before inspecting account active status (BR-04), returning generic HTTP 401 Unauthorized for unknown emails and bad passwords alike to prevent user enumeration.
- **Cryptographic Session Signing:** Sessions use HTTP-only signed cookies (`toktickit_session`) or HMAC-SHA256 Bearer tokens verified in constant time (`crypto.timingSafeEqual`) to eliminate session forgery.
- **Mandatory First-Login Password Change:** Accounts flagged with `mustChangePassword = true` are intercepted by server middleware (HTTP 403 `MUST_CHANGE_PASSWORD`) and gated by a modal enforcing password complexity ($\ge 8$ characters, uppercase, lowercase, number, and special symbol).
- **Graceful Deactivation Feedback:** Valid credentials on inactive accounts return a distinct HTTP 403 `ACCOUNT_INACTIVE` error alert without leaking registration status.

### 2. Role-Based Access Control (RBAC) & Navigation
- **Server-Side Enforcement:** Route-level middleware (`requireAuth`, `requirePasswordChangeClear`, `requireRole`) protects all endpoints according to 3 distinct roles: `REQUESTER`, `IT_STAFF`, and `ADMIN`.
- **Capability Matrix:** 17 capabilities x 4 actors (Unauthenticated, Requester, IT Staff, Admin) with explicit HTTP 401 vs. 403 status code distinctions in every cell.
- **Role-Aware UI Shell:** Dynamic navigation bar rendering role badges, dedicated navigation tabs (`My Tickets`, `Create Ticket`, `IT Queue`, `User Management`), and clean session termination on logout.

### 3. Requester Ticket Continuity & Isolation
- **Session Identity Binding:** Ticket creation is bound strictly to `req.user.id`, ignoring client-supplied identity headers.
- **Multi-Tenant Ownership Isolation:** Accessing a ticket unowned by the requester returns HTTP 404 Not Found (rather than 403) to eliminate ticket ID existence leakage.
- **Public Discussion Stream:** Real-time chronological discussion stream with author role badges (`REQUESTER`, `IT_STAFF`, `ADMIN`).
- **Problem Resolution Flag:** Requesters can indicate that their issue appears resolved (`resolvedByRequester = true`), displaying an acknowledgment banner while leaving operational ticket lifecycle status governed by IT Staff.

### 4. IT Staff Ticket Queue & Triage
- **Keyword Substring Search:** Filter tickets instantly by Ticket Number (e.g., `TKT-2026-000001`) or summary keywords.
- **Multi-Criteria Filtering:** Filter by Category, Requested Priority, Operational Status, and Assignment (`All`, `Unassigned`, `Assigned to Me`).
- **Deterministic Pagination:** Primary sorting by Date or Priority combined with a secondary `id DESC` tie-breaker to ensure stable pagination where records never shift across pages.
- **Responsive Layout:** Expanded data table on desktop ($\ge 992\text{px}$) and tablet ($768\text{px}-991\text{px}$), transforming into touch-friendly stacked cards on mobile ($< 768\text{px}$) with $\ge 44\text{px}$ touch targets.

### 5. Staff Ticket Detail & Operational Lifecycle
- **Ownership Claim & Reassignment:** One-click ticket claiming ("Claim Ticket") and assignment dropdown targeting active IT Staff members.
- **IT Priority Override:** IT Staff can adjust operational priority independently of the requester's requested priority.
- **8 Governed Status Transitions:** Server enforces strict status graph rules (`NEW -> OPEN, CANCELLED`, `OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED`, etc.). Invalid transitions are rejected with HTTP 400.
- **Confidential Internal Notes:** Private notes styled with distinct amber cards (`#FFFBEB`), 4px amber border (`#B45309`), and lock icons. Omitted entirely from requester database queries; direct endpoint access returns HTTP 403.
- **Attachment Continuity:** Attachment upload, metadata inspection, and authenticated binary downloads accessible across Requester and IT Staff roles.

### 6. Administrator User Management & Safety Guardrails
- **User Directory Administration:** Directory listing with search by name/email, role filtering, creation of accounts with single permitted role, and profile editing.
- **Administrative Password Reset:** Generates a new initial password and flags the account for mandatory password change at next login.
- **Self-Deactivation Prevention (BR-18):** Administrators cannot deactivate their own active account (HTTP 400 `CANNOT_DEACTIVATE_SELF`).
- **Last Active Administrator Protection (BR-19):** Deactivating or demoting the last active administrator is rejected (HTTP 400 `LAST_ADMIN_PROTECTED`).
- **Write Skew Prevention:** Guardrail checks and user mutations are wrapped in an interactive Prisma transaction with **Serializable isolation** (`TransactionIsolationLevel.Serializable`), preventing race condition lockouts when two administrators concurrently demote each other.

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5, Custom Zen Green CSS, Vitest, React Testing Library
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Bcrypt, Cookie-Parser, Multer, Supertest, Vitest
- **E2E & Responsive Automation:** Playwright (Desktop 1280x800, Tablet 768x1024, Mobile 375x667)
- **Database:** PostgreSQL 17 (Docker container)
- **Workflow:** Git Flow (`main` release, `lab3-staging` integration, `lab3-feature/*` sprint branches), GitHub Projects Kanban, Peer Code Reviews with `@kmood-Sakura`

---

## 🔑 Default Seeded Accounts & Credentials

The database seed provisions 11 accounts across all 3 roles with a default password of `Password@2026`:

| Full Name | Email Address | Role | Initial Password | Account Status & Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Sorawit Chaithong** | `sorawit.chaithong@email.com` | `REQUESTER` | `Password@2026` | Active Requester |
| **Piti Srisongkram** | `piti.srisongkram@gmail.com` | `IT_STAFF` | `Password@2026` | Active IT Staff (Peer Partner) |
| **John Doe** | `john.doe@email.com` | `REQUESTER` | `Password@2026` | Active Requester |
| **Jane Doe** | `jane.doe@email.com` | `REQUESTER` | `Password@2026` | Active Requester |
| **Bob Smith** | `bob.smith@email.com` | `REQUESTER` | `Password@2026` | Active (`mustChangePassword = true`) |
| **Alice Johnson** | `alice.johnson@email.com` | `REQUESTER` | `Password@2026` | Active Requester |
| **Somchai Jaidee** | `somchai.it@email.com` | `IT_STAFF` | `Password@2026` | Active IT Staff |
| **Wichai Service** | `wichai.it@email.com` | `IT_STAFF` | `Password@2026` | Active IT Staff |
| **Admin TokTickIT** | `admin.toktickit@email.com` | `ADMIN` | `Password@2026` | Active Administrator |
| **Alexanders Aleisters** | `alexanders.inactive@email.com`| `REQUESTER` | `Password@2026` | Deactivated (`isActive = false`) |
| **Charlie Inactive** | `charlie.it.inactive@email.com` | `IT_STAFF` | `Password@2026` | Deactivated (`isActive = false`) |

---

## 📂 Repository Structure

```text
toktickit/
├── artifacts/
│   ├── lab-02/screenshots/     # Sprint 2 visual evidence
│   └── lab-03/screenshots/     # Sprint 3 visual evidence across viewports
│       ├── authentication/     # Login desktop, error alerts, password change modal, mobile login
│       ├── staff-queue/        # Staff queue desktop, filtered queue, mobile cards
│       ├── staff-ticket-detail/# Operational controls, amber internal notes, comments stream, mobile
│       └── user-management/    # Admin user table, create user modal, guardrail alert, mobile cards
├── client/                     # React 18 + TypeScript Vite frontend
│   ├── src/
│   │   ├── components/         # Login, ChangePasswordModal, StaffTicketQueue, StaffTicketDetail, UserManagement...
│   │   ├── context/            # AuthContext (session, login/logout, role state), RequesterContext
│   │   ├── api.ts              # Fetch client with credentials and standard error envelopes
│   │   └── index.css           # Zen Green Design Tokens and responsive rules
│   └── tests/
│       ├── lab-01/             # Lab 1 baseline tests
│       ├── lab-02/             # Sprint 2 regression component tests
│       └── lab-03/             # Sprint 3 Vitest component & responsive suites (15 files, 75 passed)
├── server/                     # Express + TypeScript backend
│   ├── prisma/                 # Schema (User, Role, Comment, InternalNote), migrations, seed.ts
│   ├── src/
│   │   ├── middleware/         # auth.ts (requireAuth, requirePasswordChangeClear, requireRole)
│   │   ├── routes/             # authRouter, ticketsRouter, staffRouter, adminRouter, attachmentsRouter
│   │   ├── utils/              # password-validator, ticket-number generator, upload config
│   │   └── app.ts              # Express application and route mounts
│   └── tests/
│       ├── lab-01/             # Lab 1 baseline tests
│       ├── lab-02/             # Sprint 2 regression integration tests
│       └── lab-03/             # Sprint 3 API & security integration suites (20 files, 197 passed)
├── docs/
│   ├── lab-01/                 # Sprint 1 documentation
│   ├── lab-02/                 # Sprint 2 engineering records
│   └── lab-03/                 # Sprint 3 engineering contract & delivery records
│       ├── specification.md    # 11-section System Specification, RBAC Matrix, 25 BRs, 22 ACs, DoD
│       ├── api-spec.md         # Complete REST API Contract (18 endpoints)
│       ├── ui-spec.md          # Zen Green Design Tokens, Screen Layouts, Visual Checklist
│       ├── tests.md            # 8-tier Test Plan, Traceability Matrix, and 100% Pass Records
│       ├── reviewer.md         # Peer Review Transcript & Resolution Log with @kmood-Sakura
│       └── ai-use.md           # AI Prompt Records and Engineering Reflections
├── e2e/
│   ├── lab-02/                 # Sprint 2 Playwright user journey suites
│   └── lab-03/                 # Sprint 3 Playwright Multi-Viewport E2E Suites (3 viewports, 19 passed)
├── playwright.config.ts        # Playwright multi-project configuration (Desktop, Tablet, Mobile)
├── .gitignore                  # Git hygiene rules (node_modules, .env, uploads, test-results)
└── README.md                   # Project documentation and setup guide
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Docker**: For running PostgreSQL

---

### 2. Database Setup

Start the dedicated PostgreSQL container:

```bash
docker run -d --name toktickit-db \
  -e POSTGRES_USER=toktickit \
  -e POSTGRES_PASSWORD=toktickit \
  -e POSTGRES_DB=toktickit \
  -p 5432:5432 postgres:17-alpine
```

---

### 3. Environment Configuration

Create `.env` files from templates:

```bash
# In client/
cp client/.env.example client/.env

# In server/
cp server/.env.example server/.env
```

- **Client environment** (`client/.env`):
  ```env
  VITE_API_URL="http://localhost:3000"
  ```

- **Server environment** (`server/.env`):
  ```env
  DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
  PORT=3000
  SESSION_SECRET="toktickit-development-session-secret-key-32-chars-min"
  ```

---

### 4. Install Dependencies

Install dependencies across root, client, and server:

```bash
# Install root Playwright test runner dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

---

### 5. Database Schema & Idempotent Seeding

Run the Prisma migration and seed script:

```bash
cd server

# Run Prisma schema migrations
npx prisma migrate dev

# Seed Users, Categories, Related Systems, and TicketSequence
npm run prisma:seed
```

---

### 6. Running Locally

Start both server and client dev servers:

```bash
# Terminal 1 — Server (runs on http://localhost:3000)
cd server && npm run dev

# Terminal 2 — Client (runs on http://localhost:5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser and sign in with any of the seeded credentials (e.g. `admin.toktickit@email.com` / `Password@2026`).

---

## 🧪 Automated Testing & Verification

TokTickIT enforces an 8-tier automated testing strategy (100% green across all tiers):

```bash
# 1. Server Unit, API Integration, and Security Tests (20 test files, 197 tests)
cd server && npm test

# 2. Client Component, Responsive, and Zen Green Style Tests (15 test files, 75 tests)
cd client && npm test

# 3. Playwright Multi-Viewport End-to-End Suites across 3 Viewports (19 passed)
npx playwright test e2e/lab-03/
```

### Test Suite Summary

- **Server Tests (`server/tests/lab-03/`):** Password complexity unit validation (`UNIT-01`), 8-state transition graph unit validation (`UNIT-02`), database migration & seed idempotency (`MIG-01`), authentication endpoints (`API-01..07`), RBAC authorization & 403 checks (`API-08..09`), session-bound requester tickets (`API-10..14`), public comments & internal notes confidentiality (`API-15..18`), staff queue search & filtering (`API-19..20`), staff ticket operational controls (`API-21..24`), and administrator user management & safety guardrails (`API-25..27`).
- **Client Tests (`client/tests/lab-03/`):** Login form validation & error alerts (`UI-01`), ChangePasswordModal dynamic checklist (`UI-02`), TicketDetail public comments stream (`UI-03`), MyTickets user isolation (`UI-04`), StaffTicketQueue search, filtering, and sorting (`UI-05`), StaffTicketDetail operational controls & amber notes (`UI-06`), UserManagement administration & guardrails (`UI-07`), Navbar role navigation (`UI-08`), and Zen Green responsive styling.
- **E2E Tests (`e2e/lab-03/`):** Multi-viewport Playwright journeys (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`) executing across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 📋 REST API Specification (Sprint 3 Endpoints)

All endpoints enforce authenticated session identity with standard JSON envelopes and unique UUID `correlationId` tracking:

| # | Method | Endpoint | Required Role | Description | Status Codes |
| :-: | :---: | :--- | :---: | :--- | :--- |
| **1** | `POST` | `/api/auth/login` | Public | Authenticate user with email and password | `200`, `400`, `401`, `403` |
| **2** | `POST` | `/api/auth/logout` | Authenticated | Terminate session and clear cookie | `200` |
| **3** | `GET` | `/api/auth/me` | Authenticated | Retrieve current session user profile | `200`, `401`, `403` |
| **4** | `POST` | `/api/auth/change-password` | Authenticated | Mandatory or voluntary password change | `200`, `400`, `401` |
| **5** | `POST` | `/api/tickets` | `REQUESTER` | Create ticket bound to authenticated identity | `201`, `400`, `401`, `403` |
| **6** | `GET` | `/api/tickets` | `REQUESTER` | Query owned tickets with search, filters, pagination | `200`, `401`, `403` |
| **7** | `GET` | `/api/tickets/:id` | `REQUESTER` | View owned ticket detail (404 on unowned) | `200`, `401`, `404` |
| **8** | `PATCH`| `/api/tickets/:id/resolve-indication`| `REQUESTER` | Toggle requester problem resolution indication | `200`, `401`, `404` |
| **9** | `POST` | `/api/tickets/:id/comments` | Any Authenticated | Post public discussion comment | `201`, `400`, `401`, `404` |
| **10**| `GET` | `/api/tickets/:id/comments` | Any Authenticated | Retrieve public discussion comment thread | `200`, `401`, `404` |
| **11**| `POST` | `/api/tickets/:id/notes` | `IT_STAFF`, `ADMIN` | Post confidential internal note (403 for Requester) | `201`, `400`, `401`, `403`, `404` |
| **12**| `GET` | `/api/staff/tickets` | `IT_STAFF`, `ADMIN` | IT Staff queue with search, filter, sort, pagination | `200`, `401`, `403` |
| **13**| `GET` | `/api/staff/tickets/:id` | `IT_STAFF`, `ADMIN` | Full operational ticket detail including internal notes | `200`, `401`, `403`, `404` |
| **14**| `PATCH`| `/api/staff/tickets/:id/assignment` | `IT_STAFF`, `ADMIN` | Claim or reassign ticket ownership | `200`, `400`, `401`, `403`, `404` |
| **15**| `PATCH`| `/api/staff/tickets/:id/priority` | `IT_STAFF`, `ADMIN` | Override operational IT Priority | `200`, `400`, `401`, `403`, `404` |
| **16**| `PATCH`| `/api/staff/tickets/:id/status` | `IT_STAFF`, `ADMIN` | Execute governed ticket status transition | `200`, `400`, `401`, `403`, `404` |
| **17**| `GET` | `/api/admin/users` | `ADMIN` | List all users with search and role filter | `200`, `401`, `403` |
| **18**| `POST` | `/api/admin/users` | `ADMIN` | Create user with initial password and role | `201`, `400`, `401`, `403` |
| **19**| `PATCH`| `/api/admin/users/:id` | `ADMIN` | Update user profile, role, or active status | `200`, `400`, `401`, `403`, `404` |
| **20**| `POST` | `/api/admin/users/:id/reset-password` | `ADMIN` | Reset user password with mandatory change flag | `200`, `400`, `401`, `403`, `404` |

---

## 📚 Engineering Documentation

Sprint 3 contract and verification documents are located in `docs/lab-03/`:

- [System Specification](docs/lab-03/specification.md) — 11-section contract, 15 FRs, 25 BRs, 22 ACs, 17x4 RBAC matrix, and Definition of Done
- [REST API Specification](docs/lab-03/api-spec.md) — Endpoint contracts, request/response schemas, and error envelopes
- [UI Specification](docs/lab-03/ui-spec.md) — Zen Green design tokens, screen layouts, responsive breakpoints, and visual inspection checklist
- [Test Plan & Results](docs/lab-03/tests.md) — 8-tier test plan, AC traceability matrix, and 100% pass verification outputs
- [Peer Review Record](docs/lab-03/reviewer.md) — Systematic peer review records, comments received/given with `@kmood-Sakura`, and resolution notes
- [AI Use & Reflection](docs/lab-03/ai-use.md) — Curated prompt logs and student engineering reflections