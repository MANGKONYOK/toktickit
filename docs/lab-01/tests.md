# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASS |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

### Test Evidence

#### Test 1: Health Check Endpoint (`server/tests/lab-01/health.test.ts`)
```text
> toktickit-server@1.0.0 test
> vitest run tests/lab-01/health.test.ts

 RUN  v2.1.9 C:/Users/KITTIPHAT NOIKATE/Desktop/SoftEn_Lab/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 15ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  14:14:17
   Duration  7.73s (transform 48ms, setup 0ms, collect 276ms, tests 15ms, environment 0ms, prepare 88ms)
```

