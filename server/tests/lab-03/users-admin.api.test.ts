import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";
import { Role } from "@prisma/client";

describe("Administrator User Management APIs (API-25..27 / AC-20..22, BR-16..21)", () => {
  const prisma = getPrisma();

  let adminUser: any;
  let pitiStaff: any;
  let aliceRequester: any;

  let adminToken: string;
  let staffToken: string;
  let requesterToken: string;

  const createdUserIds: number[] = [];

  beforeAll(async () => {
    adminUser = await prisma.user.findFirst({
      where: { email: "admin.toktickit@email.com", isActive: true },
    });
    pitiStaff = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@email.com", isActive: true },
    });
    aliceRequester = await prisma.user.findFirst({
      where: { email: "alice.johnson@email.com", isActive: true },
    });

    if (!adminUser || !pitiStaff || !aliceRequester) {
      throw new Error("Missing required seed data for users-admin.api.test.ts");
    }

    adminToken = signBearerToken({ userId: adminUser.id, role: adminUser.role });
    staffToken = signBearerToken({ userId: pitiStaff.id, role: pitiStaff.role });
    requesterToken = signBearerToken({ userId: aliceRequester.id, role: aliceRequester.role });
  });

  afterAll(async () => {
    // Clean up created test users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  // -------------------------------------------------------------------------
  // 1. RBAC Route Protection (BR-16)
  // -------------------------------------------------------------------------
  describe("RBAC Route Gating (BR-16)", () => {
    it("rejects unauthenticated request to /api/admin/users with HTTP 401", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects REQUESTER role with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects IT_STAFF role with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects IT_STAFF attempting POST /api/admin/users with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          fullName: "Unauthorized User",
          email: "unauth@email.com",
          role: "REQUESTER",
          initialPassword: "Password@2026",
        });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/admin/users — List, Search & Filter (FR-15)
  // -------------------------------------------------------------------------
  describe("GET /api/admin/users", () => {
    it("allows ADMIN to list all users, returning safe attributes without passwordHash", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);

      const firstUser = res.body.users[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("fullName");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("role");
      expect(firstUser).toHaveProperty("isActive");
      expect(firstUser).toHaveProperty("mustChangePassword");
      expect(firstUser).not.toHaveProperty("passwordHash");
    });

    it("filters users by case-insensitive search substring in name or email", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=piti")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      res.body.users.forEach((u: any) => {
        const matches =
          u.fullName.toLowerCase().includes("piti") || u.email.toLowerCase().includes("piti");
        expect(matches).toBe(true);
      });
    });

    it("filters users by role (role=IT_STAFF)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      res.body.users.forEach((u: any) => {
        expect(u.role).toBe("IT_STAFF");
      });
    });

    it("rejects invalid role filter parameter with HTTP 400 INVALID_ROLE", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=SUPERUSER")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ROLE");
    });
  });

  // -------------------------------------------------------------------------
  // 3. POST /api/admin/users — User Creation (API-25 / AC-20, BR-02, BR-03, BR-17)
  // -------------------------------------------------------------------------
  describe("POST /api/admin/users (API-25 / AC-20)", () => {
    it("successfully creates a new user with initial password and mustChangePassword = true", async () => {
      const timestamp = Date.now();
      const payload = {
        fullName: "Test Created Staff",
        email: `staff.test.${timestamp}@email.com`,
        role: "IT_STAFF",
        initialPassword: "InitialPass@2026",
        department: "Helpdesk",
        isActive: true,
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User created successfully.");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(payload.email.toLowerCase());
      expect(res.body.user.fullName).toBe(payload.fullName);
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user.isActive).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(true);

      createdUserIds.push(res.body.user.id);

      // Verify bcrypt hash is stored in database and user can login with initial password
      const dbUser = await prisma.user.findUnique({
        where: { id: res.body.user.id },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash).not.toBe(payload.initialPassword);
      const isMatch = await bcrypt.compare(payload.initialPassword, dbUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("rejects user creation with weak initial password failing complexity rules (BR-02)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fullName: "Weak Pass User",
          email: "weakpass@email.com",
          role: "REQUESTER",
          initialPassword: "simplepassword",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors).toHaveProperty("initialPassword");
    });

    it("rejects user creation with duplicate email with HTTP 409 EMAIL_ALREADY_EXISTS (BR-17)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fullName: "Duplicate User",
          email: "alice.johnson@email.com", // existing seed email
          role: "REQUESTER",
          initialPassword: "InitialPass@2026",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("rejects user creation with missing required fields with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors).toHaveProperty("fullName");
      expect(res.body.error.fieldErrors).toHaveProperty("email");
      expect(res.body.error.fieldErrors).toHaveProperty("role");
      expect(res.body.error.fieldErrors).toHaveProperty("initialPassword");
    });
  });

  // -------------------------------------------------------------------------
  // 4. PATCH /api/admin/users/:id — Safety Guardrails (API-26, API-27 / AC-21, AC-22, BR-18, BR-19)
  // -------------------------------------------------------------------------
  describe("PATCH /api/admin/users/:id Safety Guardrails (API-26, API-27 / AC-21, AC-22)", () => {
    let secondAdmin: any;

    beforeAll(async () => {
      // Create a second active admin to test last-admin protection dynamics
      secondAdmin = await prisma.user.create({
        data: {
          fullName: "Second Temp Admin",
          email: `temp.admin.${Date.now()}@email.com`,
          role: Role.ADMIN,
          passwordHash: await bcrypt.hash("InitialPass@2026", 10),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(secondAdmin.id);
    });

    it("API-26 / AC-21: rejects admin self-deactivation with HTTP 400 CANNOT_DEACTIVATE_SELF (BR-18)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");
      expect(res.body.error.message).toContain("cannot deactivate their own account");
    });

    it("API-27 / AC-22: rejects deactivation of the last active administrator with HTTP 400 LAST_ADMIN_PROTECTED (BR-19)", async () => {
      // Temporarily deactivate second admin so only adminUser is active
      await prisma.user.update({
        where: { id: secondAdmin.id },
        data: { isActive: false },
      });

      const secondAdminToken = signBearerToken({ userId: secondAdmin.id, role: Role.ADMIN });

      // Keep only secondAdmin active:
      await prisma.user.update({
        where: { id: secondAdmin.id },
        data: { isActive: true },
      });
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { isActive: false },
      });

      // Now secondAdmin is the ONLY active admin in the DB.
      // Attempting to demote secondAdmin's role:
      const resDemote = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({ role: "IT_STAFF" });

      expect(resDemote.status).toBe(400);
      expect(resDemote.body.error.code).toBe("LAST_ADMIN_PROTECTED");

      // Attempting to deactivate secondAdmin:
      const resDeactivate = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({ isActive: false });

      expect(resDeactivate.status).toBe(400);
      expect(["CANNOT_DEACTIVATE_SELF", "LAST_ADMIN_PROTECTED"]).toContain(
        resDeactivate.body.error.code
      );

      // Restore primary adminUser to active status
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { isActive: true },
      });
    });

    it("allows editing user details (fullName, department, role) when guardrails are satisfied", async () => {
      // Create a regular user to edit
      const testUser = await prisma.user.create({
        data: {
          fullName: "Editable User",
          email: `editable.${Date.now()}@email.com`,
          role: Role.REQUESTER,
          passwordHash: await bcrypt.hash("InitialPass@2026", 10),
          isActive: true,
        },
      });
      createdUserIds.push(testUser.id);

      const res = await request(app)
        .patch(`/api/admin/users/${testUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fullName: "Updated Name",
          department: "Logistics",
          role: "IT_STAFF",
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.fullName).toBe("Updated Name");
      expect(res.body.user.department).toBe("Logistics");
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user.isActive).toBe(false);
    });

    it("rejects editing user email to an existing email with HTTP 409 EMAIL_ALREADY_EXISTS", async () => {
      const testUser = await prisma.user.create({
        data: {
          fullName: "Email Conflict User",
          email: `conflict.${Date.now()}@email.com`,
          role: Role.REQUESTER,
          passwordHash: await bcrypt.hash("InitialPass@2026", 10),
          isActive: true,
        },
      });
      createdUserIds.push(testUser.id);

      const res = await request(app)
        .patch(`/api/admin/users/${testUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "alice.johnson@email.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  // -------------------------------------------------------------------------
  // 5. POST /api/admin/users/:id/reset-password — Password Reset (BR-20)
  // -------------------------------------------------------------------------
  describe("POST /api/admin/users/:id/reset-password (BR-20)", () => {
    it("resets user password, hashes with bcrypt, and sets mustChangePassword = true", async () => {
      const userToReset = await prisma.user.create({
        data: {
          fullName: "Reset Target User",
          email: `reset.target.${Date.now()}@email.com`,
          role: Role.REQUESTER,
          passwordHash: await bcrypt.hash("OldPass@2026", 10),
          mustChangePassword: false,
          isActive: true,
        },
      });
      createdUserIds.push(userToReset.id);

      const newPassword = "ResetPass@2026";
      const res = await request(app)
        .post(`/api/admin/users/${userToReset.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Password reset successfully");

      // Verify DB state
      const updatedUser = await prisma.user.findUnique({
        where: { id: userToReset.id },
      });
      expect(updatedUser!.mustChangePassword).toBe(true);

      const isNewMatch = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
      expect(isNewMatch).toBe(true);

      // Verify user can now authenticate with the new password
      const loginRes = await request(app).post("/api/auth/login").send({
        email: userToReset.email,
        password: newPassword,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects password reset with weak password failing complexity rules with HTTP 400", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${aliceRequester.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_PASSWORD_COMPLEXITY");
    });

    it("returns HTTP 404 for non-existent user id", async () => {
      const res = await request(app)
        .post("/api/admin/users/999999/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "ResetPass@2026" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // 6. Hard Deletion Prohibition (BR-21)
  // -------------------------------------------------------------------------
  describe("Hard Deletion Prohibition (BR-21)", () => {
    it("does not expose DELETE /api/admin/users/:id (returns HTTP 404)", async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${aliceRequester.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
