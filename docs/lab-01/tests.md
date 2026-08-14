# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Test ID | Tool | Test Description | Associated Issue | Result |
|---|---------|------|------------------|------------------|:------:|
| 1 | API-01 | Supertest | `GET /api/health` returns 200 and status = ok | Issue 2 | **PASS** |
| 2 | API-02 | Supertest | `GET /api/categories` returns the four seeded categories | Issue 4 | **PASS** |
| 3 | UI-01 | Vitest | TokTickIT heading renders | Issue 1 / 4 | **PASS** |
| 4 | UI-02 | Vitest | Loading state changes to category list | Issue 4 | **PASS** |
| 5 | UI-03 | Vitest | API failure displays a useful error message | Issue 4 | **PASS** |

---

### Test Evidence

#### Server Test Suite (`server/tests/lab-01/`)
- `tests/lab-01/health.test.ts` (API-01)
- `tests/lab-01/categories.test.ts` (API-02)

```text
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/KITTIPHAT NOIKATE/Desktop/SoftEn_Lab/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 22ms
 ✓ tests/lab-01/categories.test.ts (1 test) 87ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  00:27:51
   Duration  9.25s (transform 87ms, setup 0ms, collect 559ms, tests 108ms, environment 1ms, prepare 206ms)
```

#### Client Test Suite (`client/tests/lab-01/App.test.tsx`)
- `renders the TokTickIT heading` (UI-01)
- `shows Online and the seeded categories on success` (UI-02)
- `shows an Offline error message when the API is unavailable` (UI-03)

```text
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/KITTIPHAT NOIKATE/Desktop/SoftEn_Lab/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 84ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  00:27:29
   Duration  9.76s (transform 78ms, setup 154ms, collect 164ms, tests 84ms, environment 772ms, prepare 98ms)
```

#### Feature 3 Database Evidence: Migration & Idempotent Seeding
```text
# 1. Prisma Migration
Applying migration `20260814150457_init`
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client

# 2. Seed Execution & Idempotency Test (Ran 2x)
> tsx prisma/seed.ts
Seeded categories successfully: [ 'Account and Access', 'Hardware', 'Software', 'Network' ]

# 3. Database Rows Verified (Deterministic IDs 1 to 4)
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```


