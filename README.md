# TokTickIT — IT Service Desk Starter (Lab 1)

TokTickIT is an IT service desk web application built to manage Account and Access, Hardware, Software, and Network requests. This repository contains the Sprint 1 full-stack vertical slice demonstrating integration between the React UI, Express REST API, Prisma ORM, and PostgreSQL database.

---

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, Bootstrap, Vitest, Testing Library
- **Backend**: Node.js, Express, TypeScript, tsx, Supertest, Vitest
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Workflow**: Git Flow (`main` release, `lab1-staging` integration, `feature/*` branches), GitHub Projects Kanban, Peer Code Reviews

---

## 📂 Repository Structure

```text
toktickit/
├── client/                 # React + TypeScript Vite frontend
│   ├── src/                # UI components and API client
│   └── tests/lab-01/       # Vitest client test suites
├── server/                 # Express + TypeScript backend
│   ├── prisma/             # Prisma schema and seed scripts
│   ├── src/                # API routes and database handle
│   └── tests/lab-01/       # Supertest integration test suites
├── docs/lab-01/            # Lab 1 Engineering Contract documentation
│   ├── ai_use.md           # AI prompt records and reflection
│   ├── reviewer.md         # Peer review tracking and responses
│   └── tests.md            # Test plan and execution evidence
├── .gitignore              # Git ignore rules for node_modules, .env, dist
└── README.md               # Project documentation and setup guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Docker**: For running the PostgreSQL database container

---

### 2. Database Setup

Start the dedicated PostgreSQL Docker container:

```bash
docker run -d --name toktickit-db \
  -e POSTGRES_USER=toktickit \
  -e POSTGRES_PASSWORD=toktickit \
  -e POSTGRES_DB=toktickit \
  -p 5432:5432 postgres:17-alpine
```

---

### 3. Environment Configuration

Create `.env` files from their respective templates:

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

Install packages in both `client` and `server`:

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

---

### 5. Database Migration and Seeding

Apply the Prisma database migrations and seed the initial category data:

```bash
# In server/
cd server

# Apply database migrations
npx prisma migrate dev

# Seed the 4 IT request categories
npm run prisma:seed
```

---

### 6. Running the Application Locally

Start the backend and frontend dev servers concurrently:

```bash
# Terminal 1 — Server (runs on http://localhost:3000)
cd server && npm run dev

# Terminal 2 — Client (runs on http://localhost:5173)
cd client && npm run dev
```

---

### 7. Running Automated Tests

Run the Vitest and Supertest test suites:

```bash
# Server tests (Supertest API health & category tests)
cd server && npm test

# Client tests (Vitest UI & component render tests)
cd client && npm test
```

---

## 📋 Lab 1 REST API Specification

| Method | Endpoint | Description | Expected Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check | `200 OK` (`{ status: "ok", service: "TokTickIT API" }`) |
| `GET` | `/api/categories` | Returns 4 seeded categories | `200 OK` (`[{ id, name }]` in ID order) |