# TokTickIT — IT Service Desk Web Application

TokTickIT is an IT service desk web application built to manage Account and Access, Hardware, Software, and Network support requests. This repository contains the complete **Sprint 2: Requester Self-Service** release, demonstrating full-stack integration between a React UI, Express REST API, Prisma ORM, and PostgreSQL database.

---

## 🌟 Sprint 2 Features (Requester Self-Service)

- **Development Requester Context:** Simulated user identity selection with active status filtering, React Context state management, and `x-requester-id` header precedence.
- **Sequential Ticket Creation:** Official Ticket Number generation (`TKT-YYYY-NNNNNN`) using atomic database transactions (`TicketSequence`), comprehensive server-side field validations, and Zen Green forms with inline error feedback and busy states.
- **My Tickets Queue & Filtering:** Substring search, multi-criteria filtering (Category, Priority, Status), deterministic multi-column sorting (`createdAt`, `ticketNumber`, `summary`, `updatedAt`), server-side pagination, and strict database-level multi-user ownership isolation (`where: { requesterId }`).
- **Ticket Detail Inspection:** Monospace ticket identification, read-only shaded cards (`#F0F4F1`), priority badges, and status pills.
- **Governed Attachment Lifecycle:** File upload ($\le 5\text{MB}$, JPG/PNG/WEBP/PDF, capped at 5 active files), randomized storage naming preventing path traversal, soft-removal with mandatory reasons ($\ge 5$ characters), audit history, and blocked download enforcement (`404` / `410`).
- **Zen Green Design System:** Accessible color tokens (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F0F4F1`, `#C5221F`), $\ge 44\text{px}$ touch targets, and zero horizontal overflow.
- **Multi-Viewport Responsive Experience:** Adaptive layout switching from data tables (Desktop $\ge 992\text{px}$) to compact grids (Tablet $768\text{px}-991\text{px}$) and stacked card representations (Mobile $< 768\text{px}$).

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5, Custom Zen Green CSS, Vitest, React Testing Library
- **Backend:** Node.js, Express, TypeScript, Multer, Prisma ORM, Supertest, Vitest
- **E2E & Responsive Automation:** Playwright (Desktop 1280x800, Tablet 768x1024, Mobile 375x667)
- **Database:** PostgreSQL (via Docker container)
- **Workflow:** Git Flow (`main` release, `lab2-staging` integration, `feature/*` sprint branches), GitHub Projects Kanban, Peer Code Reviews

---

## 📂 Repository Structure

```text
toktickit/
├── artifacts/lab-02/screenshots/ # Visual inspection evidence across viewports
│   ├── create-ticket/          # Ticket creation, validation, busy state
│   ├── my-tickets/             # Desktop tables, mobile cards, search, filters
│   └── ticket-detail/          # Detail view, upload modal, soft-removal audit
├── client/                     # React + TypeScript Vite frontend
│   ├── src/
│   │   ├── components/         # CreateTicket, MyTickets, TicketDetail, Navbar...
│   │   ├── context/            # RequesterContext (state & localStorage sync)
│   │   ├── api.ts              # Centralized fetch API client with header injection
│   │   └── index.css           # Zen Green Design Tokens and utilities
│   └── tests/
│       ├── lab-01/             # Lab 1 baseline tests
│       └── lab-02/             # Vitest component, responsive, and style suites
├── server/                     # Express + TypeScript backend
│   ├── prisma/                 # Prisma schema, migrations, and seed script
│   ├── src/
│   │   ├── routes/             # tickets, requesters, categories, related-systems
│   │   ├── utils/              # Multer upload config, ticket number generator, validation
│   │   └── app.ts              # Express application and route mounts
│   └── tests/
│       ├── lab-01/             # Lab 1 health & category suites
│       └── lab-02/             # API integration, validation, isolation, and lifecycle suites
├── docs/
│   ├── lab-01/                 # Sprint 1 documentation
│   └── lab-02/                 # Sprint 2 engineering contract & delivery records
│       ├── specification.md    # 11-section System Specification & Business Rules
│       ├── api-spec.md         # 10-endpoint REST API Contract
│       ├── ui-spec.md          # Zen Green UI Design Tokens & Checklists
│       ├── tests.md            # 6-tier Test Plan, Traceability, and Results
│       ├── reviewer.md         # Peer Review Transcript & Resolution Log
│       └── ai-use.md           # AI Prompt Records and Engineering Reflections
├── e2e/lab-02/                 # Playwright Multi-Viewport E2E User Journey suites
├── playwright.config.ts        # Playwright multi-project configuration
├── .gitignore                  # Git ignore rules (node_modules, .env, uploads, test-results)
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

Push the Prisma schema and run the seed script:

```bash
cd server

# Push Prisma schema to PostgreSQL
npx prisma db push

# Seed Requesters, Categories, Related Systems, and TicketSequence
npm run prisma:seed
```

---

### 6. Running Locally

Start both servers concurrently:

```bash
# Terminal 1 — Server (runs on http://localhost:3000)
cd server && npm run dev

# Terminal 2 — Client (runs on http://localhost:5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing & Verification

TokTickIT enforces a 6-tier automated testing strategy (100% green across all tiers):

```bash
# 1. Server Unit & Supertest API Tests (10 suites, 61 tests)
cd server && npm test

# 2. Client Component, Responsive & Zen Green Style Tests (8 suites, 31 tests)
cd client && npm test

# 3. Playwright Multi-Viewport End-to-End Suite (3 viewports, 24 tests)
npx playwright test
```

### Test Suite Overview:
- **Server Tests (`server/tests/lab-02/`):** Sequential ticket numbering (`UNIT-01`), input sanitization (`UNIT-02`), ticket creation (`API-01..03`), requester selection (`API-04`), reference data (`API-05`), search & filtering (`API-06`), pagination (`API-07`), ownership isolation (`API-08, API-10`), detail retrieval (`API-09`), attachment upload & validation (`API-11..13`), soft-removal audit (`API-14`), download blocking (`API-15`), and identity anti-spoofing (`API-16, API-17`).
- **Client Tests (`client/tests/lab-02/`):** RequesterSelector modal (`UI-01`), CreateTicket validation and field preservation (`UI-02..04`), MyTickets filter toolbar and dual empty states (`UI-05`), TicketDetail read-only shading (`UI-06`), AttachmentSection removal prompt (`UI-07`), Zen Green design token assertion (`STYLE-01`), and multi-viewport responsiveness (`RESP-01`).
- **E2E Tests (`e2e/lab-02/`):** 8 chained user journeys running across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 📋 Lab 2 REST API Specification (10 Capabilities)

All endpoints strictly enforce identity via the `x-requester-id` HTTP request header, backed by database query filtering (`where: { requesterId }`) to prevent unauthorized cross-tenant data leakage.

| # | Method | Endpoint | Description | Status Codes |
| :-: | :---: | :--- | :--- | :--- |
| **1** | `GET` | `/api/categories` | Retrieve active IT request categories | `200`, `500` |
| **2** | `GET` | `/api/related-systems` | Retrieve active related systems | `200`, `500` |
| **3** | `GET` | `/api/requesters` | Retrieve active simulated development requesters | `200`, `500` |
| **4** | `POST` | `/api/tickets` | Create a validated ticket with sequence `TKT-YYYY-NNNNNN` | `201`, `400`, `404`, `500` |
| **5** | `GET` | `/api/tickets` | Query owned tickets with search, filters, sort, and pagination | `200`, `400`, `404`, `500` |
| **6** | `GET` | `/api/tickets/:id` | Retrieve single owned ticket detail and attachments | `200`, `400`, `404`, `500` |
| **7** | `POST` | `/api/tickets/:id/attachments` | Upload an attachment ($\le 5\text{MB}$, JPG/PNG/WEBP/PDF, max 5 active) | `201`, `400`, `404`, `409`, `413`, `415`, `500` |
| **8** | `GET` | `/api/tickets/:id/attachments` | Retrieve attachment metadata list (active and removed) | `200`, `404`, `500` |
| **9** | `GET` | `/api/attachments/:id/download`| Download binary file stream (blocked if soft-removed) | `200`, `404`, `410`, `500` |
| **10**| `DELETE`| `/api/attachments/:id` | Soft-remove attachment with mandatory reason ($\ge 5$ chars) | `200`, `400`, `404`, `409`, `500` |

---

## 📚 Engineering Documentation

Sprint 2 documentation is located in `docs/lab-02/`:

- [System Specification](docs/lab-02/specification.md) — 11-section engineering contract, business rules, and architecture
- [REST API Specification](docs/lab-02/api-spec.md) — Request/response schemas, query parameters, and error envelopes
- [UI Specification](docs/lab-02/ui-spec.md) — Zen Green design tokens, responsive breakpoints, and visual checklist
- [Test Plan & Results](docs/lab-02/tests.md) — 6-level test plan, traceability matrix, and execution outputs
- [Peer Review Record](docs/lab-02/reviewer.md) — Peer review comments, author responses, and approval logs
- [AI Use & Reflection](docs/lab-02/ai-use.md) — Selected key prompts and engineering reflections