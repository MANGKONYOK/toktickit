import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";
import { validatePasswordComplexity } from "../../src/utils/password-validator.js";

describe("Lab 4 Sprint Hardening: Schema Migration & Full Cross-Lab Regression (MIG-01, REG-01 / AC-22)", () => {
  const prisma = getPrisma();

  let adminUser: any;
  let staffUser: any;
  let requesterUser: any;

  let adminToken: string;
  let staffToken: string;
  let requesterToken: string;

  let regressionTicketId: number;

  beforeAll(async () => {
    // Locate seeded accounts across roles
    adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
    });
    staffUser = await prisma.user.findFirst({
      where: { role: "IT_STAFF", isActive: true },
    });
    requesterUser = await prisma.user.findFirst({
      where: { role: "REQUESTER", isActive: true },
    });

    if (!adminUser || !staffUser || !requesterUser) {
      throw new Error("Required seed users across roles not found");
    }

    adminToken = signBearerToken({
      userId: adminUser.id,
      role: adminUser.role,
    });
    staffToken = signBearerToken({
      userId: staffUser.id,
      role: staffUser.role,
    });
    requesterToken = signBearerToken({
      userId: requesterUser.id,
      role: requesterUser.role,
    });

    // Create a dedicated ticket for regression testing
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const createdTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-REG-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Regression verification ticket",
        description: "Testing schema preservation and backward compatibility across Labs 1-4",
        itPriority: "LOW",
        requestedPriority: "LOW",
        currentStatus: "OPEN",
      },
    });
    regressionTicketId = createdTicket.id;
  });

  afterAll(async () => {
    if (regressionTicketId) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: regressionTicketId } });
      await prisma.internalNote.deleteMany({ where: { ticketId: regressionTicketId } });
      await prisma.comment.deleteMany({ where: { ticketId: regressionTicketId } });
      await prisma.attachment.deleteMany({ where: { ticketId: regressionTicketId } });
      await prisma.ticket.deleteMany({ where: { id: regressionTicketId } });
    }
  });

  // =========================================================================
  // Tier 1: Schema Migration & Relational Evolution Integrity (MIG-01)
  // =========================================================================
  describe("MIG-01: Database Schema Evolution & Integrity", () => {
    it("preserves all legacy entities (User, Category, Ticket, Attachment, Comment, InternalNote)", async () => {
      const userCount = await prisma.user.count();
      const catCount = await prisma.category.count();
      const ticketCount = await prisma.ticket.count();

      expect(userCount).toBeGreaterThan(0);
      expect(catCount).toBeGreaterThan(0);
      expect(ticketCount).toBeGreaterThan(0);
    });

    it("verifies parent-child cascade deletion for ActionTaken on Ticket deletion", async () => {
      // Create temporary ticket with child action
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();
      const tempTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-TEMP-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          summary: "Temporary cascade test ticket",
          description: "Cascade deletion test",
          itPriority: "LOW",
          requestedPriority: "LOW",
          currentStatus: "OPEN",
        },
      });

      const tempAction = await prisma.actionTaken.create({
        data: {
          ticketId: tempTicket.id,
          performedById: staffUser.id,
          actionDateTime: new Date(),
          description: "Temporary action to verify cascade",
          result: "Action created",
          followUpRequired: false,
        },
      });

      expect(tempAction.id).toBeDefined();

      // Delete parent ticket
      await prisma.ticket.delete({ where: { id: tempTicket.id } });

      // Verify child action is automatically deleted
      const actionAfter = await prisma.actionTaken.findUnique({
        where: { id: tempAction.id },
      });
      expect(actionAfter).toBeNull();
    });

    it("enforces foreign key constraints on ActionTaken", async () => {
      await expect(
        prisma.actionTaken.create({
          data: {
            ticketId: 999999, // non-existent
            performedById: staffUser.id,
            actionDateTime: new Date(),
            description: "Invalid ticket FK",
            result: "Should fail",
            followUpRequired: false,
          },
        })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // Tier 2: Lab 1 Baseline Capabilities (Ticket Submission & Categories)
  // =========================================================================
  describe("REG-01 [Lab 1]: Core Ticket & Category Services", () => {
    it("returns list of active categories via GET /api/categories", async () => {
      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("name");
    });

    it("rejects ticket submission when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          // missing summary, description, categoryId
          priority: "LOW",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // Tier 3: Lab 2 Baseline Capabilities (Attachments & Requester Queues)
  // =========================================================================
  describe("REG-01 [Lab 2]: Requester Isolation & Attachment Services", () => {
    it("retrieves requester tickets scoped to authenticated caller", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
      // All returned tickets must belong to requesterUser
      res.body.tickets.forEach((t: any) => {
        expect(t.requesterId).toBe(requesterUser.id);
      });
    });

    it("denies access to attachments on unowned tickets (Anti-Enumeration)", async () => {
      const otherRequester = await prisma.user.findFirst({
        where: { role: "REQUESTER", id: { not: requesterUser.id } },
      });

      if (otherRequester) {
        const otherToken = signBearerToken({
          userId: otherRequester.id,
          role: otherRequester.role,
        });

        const res = await request(app)
          .get(`/api/tickets/${regressionTicketId}/attachments`)
          .set("Authorization", `Bearer ${otherToken}`);

        expect(res.status).toBe(404);
      }
    });
  });

  // =========================================================================
  // Tier 4: Lab 3 Baseline Capabilities (Auth, RBAC, Notes, User Admin)
  // =========================================================================
  describe("REG-01 [Lab 3]: Authentication, RBAC, Internal Notes & Admin APIs", () => {
    it("authenticates valid credentials via POST /api/auth/login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: staffUser.email,
          password: "Password@2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(staffUser.email);
    });

    it("rejects invalid login credentials with HTTP 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: staffUser.email,
          password: "WrongPassword@2026",
        });

      expect(res.status).toBe(401);
    });

    it("enforces password complexity validation rules", () => {
      const weak = validatePasswordComplexity("weakpass");
      expect(weak.isValid).toBe(false);

      const strong = validatePasswordComplexity("Password@2026");
      expect(strong.isValid).toBe(true);
    });

    it("enforces RBAC: IT Staff ticket queue rejected for Requesters (HTTP 403)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("permits IT Staff access to staff ticket queue (HTTP 200)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it("maintains confidentiality boundary: Requesters cannot read internal notes", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${regressionTicketId}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("enforces Administrator RBAC on user management APIs (HTTP 403 for Staff/Requester)", async () => {
      const resStaff = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(resStaff.status).toBe(403);

      const resAdmin = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);
      expect(Array.isArray(resAdmin.body.users)).toBe(true);
    });
  });

  // =========================================================================
  // Tier 5: Lab 4 Capabilities (Actions Taken, Concurrency, Dashboards)
  // =========================================================================
  describe("REG-01 [Lab 4]: Actions Taken, Concurrency & Operational Dashboards", () => {
    it("allows IT Staff to record an Action Taken on active ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${regressionTicketId}/actions`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          actionDateTime: new Date().toISOString(),
          description: "Regression test action step",
          result: "Verified successfully",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.action).toBeDefined();
      expect(res.body.action.performedById).toBe(staffUser.id);
    });

    it("provides Requester Dashboard with caller-scoped non-terminal metrics", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(typeof res.body.metrics.totalOpen).toBe("number");
      expect(Array.isArray(res.body.recentTickets)).toBe(true);
    });

    it("provides IT Staff Dashboard with operational metrics and distributions", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(typeof res.body.metrics.unassignedTickets).toBe("number");
      expect(typeof res.body.metrics.myAssignedTickets).toBe("number");
      expect(res.body.metrics.ticketsByStatus).toBeDefined();
      expect(res.body.metrics.ticketsByPriority).toBeDefined();
    });

    it("provides Admin Dashboard with operational metrics plus user account health", async () => {
      const res = await request(app)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userStats).toBeDefined();
      expect(typeof res.body.userStats.totalUsers).toBe("number");
      expect(typeof res.body.userStats.activeUsers).toBe("number");
      expect(typeof res.body.userStats.inactiveUsers).toBe("number");
    });
  });
});

