# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Test ID | Tool | Test Description | Associated Issue | Result |
|---|---------|------|------------------|------------------|:------:|
| 1 | API-01 | Supertest | `GET /api/health` returns 200 and status = ok | Issue 2 | **PASS** |
| 2 | API-02 | Supertest | `GET /api/categories` returns the four seeded categories | Issue 4 | *Pending Issue 4* |
| 3 | UI-01 | Vitest | TokTickIT heading renders | Issue 1 / 4 | **PASS** |
| 4 | UI-02 | Vitest | Loading state changes to category list | Issue 4 | *Pending Issue 4* |
| 5 | UI-03 | Vitest | API failure displays a useful error message | Issue 4 | *Pending Issue 4* |

---

### Test Evidence

#### Test 1 (API-01): Health Check Endpoint (`server/tests/lab-01/health.test.ts`)
```text
> toktickit-server@1.0.0 test
> vitest run tests/lab-01/health.test.ts

 RUN  v2.1.9 C:/Users/KITTIPHAT NOIKATE/Desktop/SoftEn_Lab/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 21ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

#### Test 3 (UI-01): Heading Render (`client/tests/lab-01/App.test.tsx`)
```text
> toktickit-client@1.0.0 test
> vitest run tests/lab-01/App.test.tsx

 RUN  v2.1.9 C:/Users/KITTIPHAT NOIKATE/Desktop/SoftEn_Lab/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests | 2 skipped) 23ms

 Test Files  1 passed (1)
      Tests  1 passed | 2 todo (3)
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


