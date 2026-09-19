import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Role-Based Access Control Authorization (API-08..09 / AC-07)", () => {
  it("API-08: Requester role is forbidden (403) from accessing staff ticket queue", async () => {
    // Login as Requester
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jane.doe@email.com",
        password: "Password@2026",
      });

    expect(loginRes.status).toBe(200);
    const sessionCookie = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-09: IT_STAFF role is forbidden (403) from accessing admin user management", async () => {
    // Login as IT Staff
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "piti.srisongkram@email.com",
        password: "Password@2026",
      });

    expect(loginRes.status).toBe(200);
    const sessionCookie = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
