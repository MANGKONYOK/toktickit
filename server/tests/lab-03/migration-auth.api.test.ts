import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Migrated Requester Authentication & Password Change Gate (MIG-01 / AC-04, §5.2)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    // Reset Bob Smith to simulated migrated state: mustChangePassword: true, default hash
    const hash = await bcrypt.hash("Password@2026", 10);
    await prisma.user.upsert({
      where: { email: "bob.smith@email.com" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: true,
        role: "REQUESTER",
      },
      create: {
        fullName: "Bob Smith",
        email: "bob.smith@email.com",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        department: "Finance",
      },
    });
  });

  it("MIG-01: logs in successfully with initial password but mustChangePassword is true", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "bob.smith@email.com",
        password: "Password@2026",
      });

    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);

    const sessionCookie = res.headers["set-cookie"];
    expect(sessionCookie).toBeDefined();

    // Verify change-password clears the gate
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", sessionCookie)
      .send({
        currentPassword: "Password@2026",
        newPassword: "B0bSecurePass#2026",
        confirmPassword: "B0bSecurePass#2026",
      });

    expect(changeRes.status).toBe(200);

    // Verify /api/auth/me now reflects mustChangePassword: false
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(false);

    // Reset Bob back for idempotency
    const resetHash = await bcrypt.hash("Password@2026", 10);
    await prisma.user.update({
      where: { email: "bob.smith@email.com" },
      data: { passwordHash: resetHash, mustChangePassword: true },
    });
  });
});
