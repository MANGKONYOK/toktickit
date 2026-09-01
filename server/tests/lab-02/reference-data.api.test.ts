import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Reference Data APIs (API-05 / AC-04)", () => {
  describe("GET /api/categories", () => {
    it("returns HTTP 200 with the 4 active categories", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toEqual([
        "Account and Access",
        "Hardware",
        "Software",
        "Network",
      ]);
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns HTTP 200 with the 7 active related systems", async () => {
      const res = await request(app).get("/api/related-systems");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(7);

      for (const sys of res.body) {
        expect(sys).toHaveProperty("id");
        expect(sys).toHaveProperty("name");
        expect(sys).toHaveProperty("description");
      }

      const names = res.body.map((s: { name: string }) => s.name);
      expect(names).toContain("Email");
      expect(names).toContain("Campus Wi-Fi");
      expect(names).toContain("VPN");
      expect(names).toContain("LEB2 App");
      expect(names).toContain("Grade Submission App");
      expect(names).toContain("Printer");
      expect(names).toContain("Corporate Laptop");
    });
  });
});
