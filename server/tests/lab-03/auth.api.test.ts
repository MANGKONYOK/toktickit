import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";
import { signBearerToken, SESSION_COOKIE_NAME } from "../../src/middleware/auth.js";

describe("Authentication APIs (API-01..07 / AC-01..06, BR-01..04)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    // Ensure test user states are clean and predictable
    const hash = await bcrypt.hash("Password@2026", 10);
    await prisma.user.upsert({
      where: { email: "piti.srisongkram@email.com" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        fullName: "Piti Srisongkram",
        email: "piti.srisongkram@email.com",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        department: "Engineering",
      },
    });

    await prisma.user.upsert({
      where: { email: "alexanders.inactive@email.com" },
      update: {
        passwordHash: hash,
        isActive: false,
        mustChangePassword: true,
      },
      create: {
        fullName: "Alexanders Aleisters (Inactive)",
        email: "alexanders.inactive@email.com",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: false,
        mustChangePassword: true,
        department: "Operations",
      },
    });
  });

  describe("POST /api/auth/login", () => {
    it("API-01: logs in successfully with valid credentials and sets session cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.email).toBe("piti.srisongkram@email.com");
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user).not.toHaveProperty("passwordHash");
      expect(res.body.message).toBe("Login successful.");

      // Check cookie header
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies?.find((c: string) => c.includes("toktickit_session"));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
    });

    it("API-02: returns 400 Bad Request when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "piti.srisongkram@email.com" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-02: returns 401 Unauthorized for incorrect password without leaking existence", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("API-02: returns 401 Unauthorized for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent.user@email.com",
          password: "Password@2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("API-03 / AC-03 / BR-04: returns 403 Forbidden (ACCOUNT_INACTIVE) when credentials match inactive account", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alexanders.inactive@email.com",
          password: "Password@2026",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    });

    it("API-03 / AC-03 / BR-04: returns 401 Unauthorized when password is wrong even on inactive account (Anti-Enumeration)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alexanders.inactive@email.com",
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/me", () => {
    it("API-04: returns 401 Unauthorized when no session cookie is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("API-04: returns 200 OK with user profile when valid session cookie is provided", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("piti.srisongkram@email.com");
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("Issue-04 / Security: strictly rejects unsigned session cookie", async () => {
      // Attacker attempts to forge cookie by setting plain un-signed cookie header
      const forgedPlainPayload = JSON.stringify({ userId: 1, role: "ADMIN" });
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(forgedPlainPayload)}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("Issue-04 / Security: strictly rejects forged or unverified Bearer token", async () => {
      // Plain base64 token without HMAC signature
      const forgedToken = Buffer.from(JSON.stringify({ userId: 1, role: "ADMIN" })).toString("base64");
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("Issue-04 / Security: authenticates with cryptographically signed Bearer token", async () => {
      const user = await prisma.user.findFirst({ where: { email: "piti.srisongkram@email.com" } });
      const validBearer = signBearerToken({ userId: user!.id, role: user!.role });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validBearer}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("piti.srisongkram@email.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("API-07: revokes session cookie and clears authentication", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", sessionCookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe("Logout successful.");

      // Check that session cookie is cleared
      const setCookie = logoutRes.headers["set-cookie"]?.join("; ") || "";
      expect(setCookie.toLowerCase()).toMatch(/toktickit_session=;|(max-age=0)|(expires=thu, 01 jan 1970)/);

      // Verify subsequent request without session fails
      const meRes = await request(app).get("/api/auth/me");
      expect(meRes.status).toBe(401);
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("API-06: rejects weak new password with 400 PASSWORD_COMPLEXITY_FAILED", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", sessionCookie)
        .send({
          currentPassword: "Password@2026",
          newPassword: "weak",
          confirmPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("PASSWORD_COMPLEXITY_FAILED");
    });

    it("API-06: rejects mismatched confirm password with 400", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", sessionCookie)
        .send({
          currentPassword: "Password@2026",
          newPassword: "NewPassword@2026",
          confirmPassword: "DifferentPassword@2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("PASSWORD_MISMATCH");
    });

    it("API-05: rejects invalid current password with 401 INVALID_CURRENT_PASSWORD", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", sessionCookie)
        .send({
          currentPassword: "IncorrectCurrentPassword123!",
          newPassword: "ValidNewPassword@2026",
          confirmPassword: "ValidNewPassword@2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    });

    it("API-05: successfully changes password with complex new password", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "Password@2026",
        });

      const sessionCookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", sessionCookie)
        .send({
          currentPassword: "Password@2026",
          newPassword: "NewComplexPassword@2026",
          confirmPassword: "NewComplexPassword@2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password changed successfully.");

      // Verify can login with new password
      const reLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: "piti.srisongkram@email.com",
          password: "NewComplexPassword@2026",
        });
      expect(reLogin.status).toBe(200);

      // Revert password back to default for test idempotency
      await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", reLogin.headers["set-cookie"])
        .send({
          currentPassword: "NewComplexPassword@2026",
          newPassword: "Password@2026",
          confirmPassword: "Password@2026",
        });
    });
  });
});
