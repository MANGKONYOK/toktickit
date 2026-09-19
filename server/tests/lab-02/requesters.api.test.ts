import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("GET /api/requesters (API-04 / AC-02, BR-04)", () => {
  let authToken: string;

  beforeAll(async () => {
    const user = await getPrisma().user.findFirst({
      where: { isActive: true, mustChangePassword: false },
    });
    if (!user) throw new Error("Missing active user seed");
    authToken = signBearerToken({ userId: user.id, role: user.role });
  });

  it("returns HTTP 200 with an array of active Development Requesters when authenticated", async () => {
    const res = await request(app)
      .get("/api/requesters")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    // Verify all returned requesters are active
    for (const requester of res.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("fullName");
      expect(requester).toHaveProperty("email");
      expect(requester).toHaveProperty("department");
      expect(requester.isActive).toBe(true);
    }

    const fullNames = res.body.map((r: { fullName: string }) => r.fullName);
    expect(fullNames).toContain("Sorawit Chaithong");
    expect(fullNames).toContain("Piti Srisongkram");
    expect(fullNames).toContain("John Doe");
    expect(fullNames).toContain("Jane Doe");
  });

  it("strictly excludes inactive requesters from the selector list (BR-04)", async () => {
    const res = await request(app)
      .get("/api/requesters")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const fullNames = res.body.map((r: { fullName: string }) => r.fullName);
    expect(fullNames).not.toContain("Alexanders Aleisters (Inactive)");
  });

  it("rejects unauthenticated requests with 401 Unauthorized to prevent directory enumeration", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
