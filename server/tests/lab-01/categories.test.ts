import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Issue 4 — Category list integration test
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);

    // Verify category names match the expected seeded order
    const names = res.body.map((cat: { name: string }) => cat.name);
    expect(names).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    // Verify IDs are positive numbers and strictly in ascending order
    const ids = res.body.map((cat: { id: number }) => cat.id);
    for (let i = 0; i < ids.length; i++) {
      expect(typeof ids[i]).toBe("number");
      if (i > 0) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1]);
      }
    }
  });
});

