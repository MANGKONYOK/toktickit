# TokTickIT - IT Service Desk Web Application

TokTickIT is an enterprise IT service desk web application built to manage Account and Access, Hardware, Software, and Network support requests. This repository contains the complete **Sprint 4: Actions Taken, Ticket Resolution & Concurrency Control, Role Dashboards, and Multi-Viewport Release** delivery, showcasing full-stack integration between a React 18 frontend, Express REST API, Prisma ORM, and PostgreSQL database.

---

## 🌟 Sprint 4 Features

### 1. Actions Taken Audit Trail & Data Model
- **Additive Database Schema:** Dedicated `ActionTaken` model with 1:N relations under `Ticket` and `User`, preserving non-destructive migration (`20261002090000_add_action_taken_model`) and 100% backward compatibility with Labs 1–3 data models.
- **Session-Bound Identity:** Performer identity is derived strictly from the authenticated session (`req.user.id`), preventing client identity spoofing or tampering (`AC-01`, `AUTH-03`).
- **REST Lifecycle Endpoints:** Four secure endpoints (`POST`, `GET`, `PATCH /api/tickets/:id/actions`) restricted to authorized staff and administrators (`AC-02`, `AUTH-01`).
- **Dynamic Follow-Up Validation:** Submitting an action with `followUpRequired = true` enforces non-empty `followUpNote` validation at both frontend UI and API boundary (`AC-04`, `AC-05`).
- **Multi-Role Timeline UI:**
  - **IT Staff View:** Interactive action logging modal, inline action cards with timestamps, duration, performer role badges, and edit controls.
  - **Requester View:** Clean, read-only chronological timeline displaying performed actions and reassuring follow-up status badges (`AC-19`).

### 2. Governed Lifecycle, Resolution Gate & Concurrency Control
- **Advisory Requester Resolution:** Requesters can indicate that their issue is resolved (`resolvedByRequester = true` via `PATCH /api/tickets/:id/resolve`), posting an automated discussion comment without prematurely closing the operational workflow (`AC-08`).
- **Authoritative Resolution Gate:** Only IT Staff and Administrators have authority to formally transition tickets to `RESOLVED` or `CLOSED` (`AC-09`).
- **Optimistic Concurrency Control (OCC):** Status transitions mandate an `expectedUpdatedAt` concurrency token matching the current database timestamp. Stale writes return `HTTP 409 Conflict` (`STALE_UPDATE`), preventing silent race-condition overwrites (`AC-11`).
- **Interactive Stale Conflict UI:** The frontend intercepts HTTP 409, preserves unsaved user form inputs, displays a prominent conflict warning banner, and offers a single-click state reload.
- **Terminal State Locking:** Tickets in `CLOSED` or `CANCELLED` status are strictly immutable; any subsequent status transitions or action creations are rejected with `HTTP 400 Bad Request` (`AC-12`).

### 3. Role-Based Operational Dashboards & Analytics
- **Authoritative PostgreSQL Aggregates:** Computed exclusively using lightweight Prisma `.count()` and `.groupBy()` aggregates directly in PostgreSQL, eliminating memory bloat and client-side recalculation overhead.
- **Requester Dashboard:** 4 Zen Green metric cards (`Total Open`, `Waiting for Your Input` with amber alert styling when $> 0$, `Updated in Past 7 Days`, `Resolved & Closed`), top 5 recent requests table, and quick ticket creation CTA (`AC-13`, `AC-15`).
- **Staff Operational Dashboard:** 4 operational counters (`Unassigned Tickets`, `My Active Tickets`, `Awaiting Feedback`, `Urgent Attention`), real-time status and priority distribution progress bars, and recent actions log (`AC-14`).
- **Administrator Augmented View:** Augmented staff operational view featuring user directory statistics (`totalUsers`, `activeUsers`, `inactiveUsers`, and role breakdown) (`AC-21`).
- **URL-Driven Filter Drill-Down & Lifecycle Reset:** Metric cards route directly to pre-filtered queues (`/tickets?tab=open`, `/staff/tickets?assigned=unassigned`, etc.) with automated filter reset on navbar navigation to prevent filter residue (`AC-16`, `AC-17`, `AC-18`).

### 4. Zen Green Design System & Responsive Reflow
- **Design Token Conformance:** Strict adherence to Zen Green design tokens (`--zg-primary`, `--zg-surface`, `--zg-border`, `--zg-amber`, `--zg-action-followup-bg`) with zero raw hardcoded hex colors (`STYLE-01`, `STYLE-02`).
- **Three Responsive Viewports:**
  - **Desktop ($\ge 1280\text{px}$):** 4-column metric card grid and 2-column ticket detail layout (`RESP-01`).
  - **Tablet ($768\text{px} - 991\text{px}$):** 2x2 metric card grid and vertically stacked detail panels (`RESP-02`).
  - **Mobile ($< 768\text{px}$):** 1-column vertically stacked cards with touch-friendly touch targets ($\ge 44\text{px}$) and zero horizontal scrollbar overflow (`RESP-03`).

### 5. Multi-Tier Automated Verification & 100% Cross-Lab Regression
- **10-Tier Test Architecture:** Unit, validation, API integration, authorization, workflow concurrency, UI component, responsive reflow, and Playwright browser E2E test suites.
- **100% Cross-Lab Regression:** Comprehensive database integration suite (`regression-labs1-3.test.ts`) verifying backward compatibility across Labs 1, 2, 3, and 4 with complete test isolation and teardown (`AC-22`, `MIG-01`, `REG-01`).
- **Visual Artifacts:** 10 verified screenshot artifacts captured across Desktop, Tablet, and Mobile viewports preserved in `artifacts/lab-04/screenshots/`.

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5, Custom Zen Green CSS, Vitest, React Testing Library
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Bcrypt, Cookie-Parser, Multer, Supertest, Vitest
- **E2E & Responsive Automation:** Playwright (Desktop 1280x800, Tablet 768x1024, Mobile 375x667)
- **Database:** PostgreSQL 17 (Docker container)
- **Workflow:** Git Flow (`main` release, `lab4-staging` integration, `lab4-feature/*` sprint branches), GitHub Projects Kanban, Peer Code Reviews with `@kmood-Sakura`

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
│   ├── lab-03/screenshots/     # Sprint 3 visual evidence across viewports
│   └── lab-04/screenshots/     # Sprint 4 visual evidence across viewports
│       ├── actions-taken/      # Staff timeline, record action modal, requester read-only view
│       ├── dashboards/         # Requester & staff dashboards across desktop, tablet, mobile
│       └── ticket-resolution/  # Advisory resolution, staff formal resolution, concurrency conflict dialog
├── client/                     # React 18 + TypeScript Vite frontend
│   ├── src/
│   │   ├── components/         # ActionsTakenSection, RequesterDashboard, StaffDashboard, StaffTicketDetail...
│   │   ├── context/            # AuthContext (session, role state), RequesterContext
│   │   ├── api.ts              # Fetch client with credentials and standard error envelopes
│   │   └── index.css           # Zen Green Design Tokens and responsive rules
│   └── tests/
│       ├── lab-01/             # Lab 1 baseline tests
│       ├── lab-02/             # Sprint 2 regression component tests
│       ├── lab-03/             # Sprint 3 Vitest component & responsive suites
│       └── lab-04/             # Sprint 4 Vitest component & style suites (20 files, 106 passed)
├── server/                     # Express + TypeScript backend
│   ├── prisma/                 # Schema (User, Ticket, ActionTaken, Comment, Note), migrations, seed.ts
│   ├── src/
│   │   ├── middleware/         # auth.ts (requireAuth, requirePasswordChangeClear, requireRole)
│   │   ├── routes/             # authRouter, ticketsRouter, staffRouter, adminRouter, dashboardRouter...
│   │   ├── utils/              # dashboard-query, actions-validation, workflow-engine, ticket-number...
│   │   └── app.ts              # Express application and route mounts
│   └── tests/
│       ├── lab-01/             # Lab 1 baseline tests
│       ├── lab-02/             # Sprint 2 regression integration tests
│       ├── lab-03/             # Sprint 3 API & security integration suites
│       └── lab-04/             # Sprint 4 API, workflow, and regression suites (27 files, 279 passed)
├── docs/
│   ├── lab-01/                 # Sprint 1 documentation
│   ├── lab-02/                 # Sprint 2 engineering records
│   ├── lab-03/                 # Sprint 3 engineering records
│   └── lab-04/                 # Sprint 4 engineering contract & delivery records
│       ├── specification.md    # 11-section System Specification, RBAC Matrix, 25 BRs, 22 ACs, DoD
│       ├── api-spec.md         # Complete REST API Contract (25 endpoints)
│       ├── ui-spec.md          # Zen Green Design Tokens, Screen Layouts, Visual Checklist
│       ├── tests.md            # 8-tier Test Plan, Traceability Matrix, and 100% Pass Records
│       ├── reviewer.md         # Peer Review Transcript & Resolution Log with @kmood-Sakura
│       └── ai-use.md           # AI Prompt Records and Engineering Reflections (10 key prompts)
├── e2e/
│   ├── lab-02/                 # Sprint 2 Playwright user journey suites
│   ├── lab-03/                 # Sprint 3 Playwright multi-viewport E2E suites
│   └── lab-04/                 # Sprint 4 Playwright E2E suites (3 specs, 18 passed across viewports)
│       ├── actions-taken-flow.spec.ts  # End-to-end IT Staff action logging and requester view
│       ├── dashboards.spec.ts          # Requester/staff dashboard metrics, drill-down, and reflow
│       └── ticket-resolution.spec.ts   # Advisory flag, resolution gate, and concurrency conflict
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

# Seed Users, Categories, Related Systems, Tickets, and Actions Taken
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

Open [http://localhost:5173](http://localhost:5173) in your browser and sign in with any of the seeded credentials (e.g., `somchai.it@email.com` / `Password@2026`).

---

## 🧪 Automated Testing & Verification

TokTickIT enforces a rigorous automated testing strategy across all tiers (100% green):

```bash
# 1. Server Unit, API Integration, Concurrency, and Regression Tests (27 files, 279 tests)
cd server && npm test

# 2. Client Component, Responsive, and Zen Green Style Tests (20 files, 106 tests)
cd client && npm test

# 3. Playwright Multi-Viewport End-to-End Suites (3 specs across Desktop, Tablet, Mobile: 18 passed)
npx playwright test e2e/lab-04/
```

### Test Suite Summary

- **Server Tests (`server/tests/`):** 279 tests passing across 27 test files covering action validation unit tests (`actions-validation.unit.test.ts`), workflow state machine (`workflow-engine.unit.test.ts`), password validator, actions REST APIs (`actions-taken.api.test.ts`), ticket resolution gate & concurrency conflict (`ticket-workflow.api.test.ts`), requester & staff dashboards (`requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`), and the full cross-lab database regression suite (`regression-labs1-3.test.ts`).
- **Client Tests (`client/tests/`):** 106 tests passing across 20 test files covering `ActionsTaken.test.tsx` (action timeline, follow-up validation, requester view), `RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx`, `DashboardStyles.test.tsx` (Zen Green CSS tokens, zero raw hex colors), login, password change, queue filters, and user administration.
- **E2E Tests (`e2e/lab-04/`):** Multi-viewport Playwright journeys (`actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts`) executing across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 📋 REST API Specification (Sprint 4 Endpoints)

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
| **8** | `PATCH`| `/api/tickets/:id/resolve` | `REQUESTER` | Advisory requester problem resolution indication | `200`, `401`, `404` |
| **9** | `POST` | `/api/tickets/:id/comments` | Any Authenticated | Post public discussion comment | `201`, `400`, `401`, `404` |
| **10**| `GET` | `/api/tickets/:id/comments` | Any Authenticated | Retrieve public discussion comment thread | `200`, `401`, `404` |
| **11**| `POST` | `/api/tickets/:id/notes` | `IT_STAFF`, `ADMIN` | Post confidential internal note (403 for Requester) | `201`, `400`, `401`, `403`, `404` |
| **12**| `GET` | `/api/tickets/:id/actions` | Authenticated | List all actions taken for ticket (unowned 404 for Requester)| `200`, `401`, `404` |
| **13**| `POST` | `/api/tickets/:id/actions` | `IT_STAFF`, `ADMIN` | Record new action taken with session-bound performer | `201`, `400`, `401`, `403`, `404` |
| **14**| `PATCH`| `/api/tickets/:id/actions/:actionId` | `IT_STAFF`, `ADMIN` | Update an existing action taken record | `200`, `400`, `401`, `403`, `404` |
| **15**| `GET` | `/api/staff/tickets` | `IT_STAFF`, `ADMIN` | IT Staff queue with search, filter, sort, pagination | `200`, `401`, `403` |
| **16**| `GET` | `/api/staff/tickets/:id` | `IT_STAFF`, `ADMIN` | Full operational ticket detail including internal notes | `200`, `401`, `403`, `404` |
| **17**| `PATCH`| `/api/staff/tickets/:id/assignment` | `IT_STAFF`, `ADMIN` | Claim or reassign ticket ownership | `200`, `400`, `401`, `403`, `404` |
| **18**| `PATCH`| `/api/staff/tickets/:id/priority` | `IT_STAFF`, `ADMIN` | Override operational IT Priority | `200`, `400`, `401`, `403`, `404` |
| **19**| `PATCH`| `/api/staff/tickets/:id/status` | `IT_STAFF`, `ADMIN` | Execute status transition with `expectedUpdatedAt` OCC gate | `200`, `400`, `401`, `403`, `409` |
| **20**| `GET` | `/api/dashboard/requester` | `REQUESTER`, `ADMIN` | Requester operational metrics & recent tickets | `200`, `401`, `403` |
| **21**| `GET` | `/api/dashboard/staff` | `IT_STAFF`, `ADMIN` | IT Staff operational metrics, distributions & recent actions | `200`, `401`, `403` |
| **22**| `GET` | `/api/dashboard/admin` | `ADMIN` | Staff metrics augmented with user account statistics | `200`, `401`, `403` |
| **23**| `GET` | `/api/admin/users` | `ADMIN` | List all users with search and role filter | `200`, `401`, `403` |
| **24**| `POST` | `/api/admin/users` | `ADMIN` | Create user with initial password and role | `201`, `400`, `401`, `403` |
| **25**| `PATCH`| `/api/admin/users/:id` | `ADMIN` | Update user profile, role, or active status | `200`, `400`, `401`, `403`, `404` |

---

## 📚 Engineering Documentation

Sprint 4 contract, test plans, and verification records are located in `docs/lab-04/`:

- [System Specification](docs/lab-04/specification.md) — 11-section contract, 16 FRs, 25 BRs, 22 ACs, RBAC matrix, and Definition of Done
- [REST API Specification](docs/lab-04/api-spec.md) — Endpoint contracts, request/response schemas, OCC parameters, and error envelopes
- [UI Specification](docs/lab-04/ui-spec.md) — Zen Green design tokens, screen layouts, responsive breakpoints, and visual inspection checklist
- [Test Plan & Results](docs/lab-04/tests.md) — 8-tier test plan, AC traceability matrix, and 100% pass verification outputs
- [Peer Review Record](docs/lab-04/reviewer.md) — Systematic peer review records, comments received/given with `@kmood-Sakura`, and resolution notes
- [AI Use & Reflection](docs/lab-04/ai-use.md) — Curated 10 key prompt logs and student engineering reflections
