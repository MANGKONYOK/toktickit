import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("Requester Ticket Operations (API-10, API-11, API-14 / AC-08, AC-09, AC-11)", () => {
  const prisma = getPrisma();

  let userAId: number;
  let userBId: number;
  let userTokenA: string;
  let userTokenB: string;
  let userWithMustChangePasswordToken: string;
  let catHardwareId: number;
  let sysLaptopId: number;
  let ticketUserAId: number;

  beforeAll(async () => {
    // Look up test accounts
    const userA = await prisma.user.findFirst({
      where: { email: "sorawit.chaithong@email.com", isActive: true },
    });
    const userB = await prisma.user.findFirst({
      where: { email: "jane.doe@email.com", isActive: true },
    });
    const userMustChange = await prisma.user.findFirst({
      where: { email: "bob.smith@email.com", isActive: true },
    });
    const category = await prisma.category.findFirst({
      where: { name: "Hardware", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Corporate Laptop", isActive: true },
    });

    if (!userA || !userB || !userMustChange || !category || !system) {
      throw new Error("Missing required seed data for tickets.api.test.ts");
    }

    userAId = userA.id;
    userBId = userB.id;
    catHardwareId = category.id;
    sysLaptopId = system.id;

    userTokenA = signBearerToken({ userId: userA.id, role: userA.role });
    userTokenB = signBearerToken({ userId: userB.id, role: userB.role });
    userWithMustChangePasswordToken = signBearerToken({
      userId: userMustChange.id,
      role: userMustChange.role,
    });

    // Create a known ticket owned by User A
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3TEST-${Date.now().toString().slice(-6)}`,
        requesterId: userAId,
        categoryId: catHardwareId,
        relatedSystemId: sysLaptopId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        summary: "Feature 3 User A Owned Ticket",
        description: "Initial ticket description for Feature 3 verification.",
        ticketOwner: "Unassigned",
        resolvedByRequester: false,
      },
    });

    ticketUserAId = ticketA.id;
  });

  describe("API-10 / AC-08: Ticket Creation Attribution", () => {
    it("creates ticket with requesterId strictly bound to session req.user.id, ignoring spoofed requesterId in body", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          requesterId: 999999, // Attempted spoof
          categoryId: catHardwareId,
          relatedSystemId: sysLaptopId,
          requestedPriority: "HIGH",
          summary: "Monitor flickering after driver update",
          description: "External monitor flashes black every few seconds on HDMI.",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.requesterId).toBe(userAId);
      expect(res.body.requesterId).not.toBe(999999);
      expect(res.body.requestedPriority).toBe("HIGH");
      expect(res.body.itPriority).toBe("HIGH"); // BR-13
      expect(res.body.resolvedByRequester).toBe(false);
    });

    it("blocks ticket creation with 403 PASSWORD_CHANGE_REQUIRED when user has mustChangePassword: true", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${userWithMustChangePasswordToken}`)
        .send({
          categoryId: catHardwareId,
          relatedSystemId: sysLaptopId,
          requestedPriority: "MEDIUM",
          summary: "Need keyboard replaced",
          description: "Spacebar sticking intermittently.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("API-11 / AC-09: Requester Ownership Boundary Isolation", () => {
    it("returns HTTP 404 when requester attempts to retrieve another requester's ticket directly", async () => {
      // User B attempts to access User A's ticket
      const res = await request(app)
        .get(`/api/tickets/${ticketUserAId}`)
        .set("Authorization", `Bearer ${userTokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns HTTP 200 when requester accesses their own ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketUserAId}`)
        .set("Authorization", `Bearer ${userTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticketUserAId);
      expect(res.body.requester.id).toBe(userAId);
      expect(res.body).toHaveProperty("resolvedByRequester");
    });
  });

  describe("API-14 / AC-11: Requester Problem Resolution Indication", () => {
    it("successfully indicates problem resolved (sets resolvedByRequester: true, status unchanged)", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketUserAId}/resolve-indication`)
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          comment: "Issue resolved after restarting laptop. Thank you!",
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.id).toBe(ticketUserAId);
      expect(res.body.ticket.resolvedByRequester).toBe(true);
      expect(res.body.ticket.status).toBe("OPEN"); // Preserves status per BR-05

      // Verify persisted state in database
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticketUserAId },
        include: { comments: true },
      });
      expect(updatedTicket?.resolvedByRequester).toBe(true);
      expect(updatedTicket?.currentStatus).toBe("OPEN");

      // Verify optional audit comment was recorded
      const auditComment = updatedTicket?.comments.find(
        (c) => c.content === "Issue resolved after restarting laptop. Thank you!"
      );
      expect(auditComment).toBeDefined();
      expect(auditComment?.authorId).toBe(userAId);
    });

    it("returns HTTP 404 when non-owner attempts to indicate problem resolved", async () => {
      // User B attempts to resolve User A's ticket
      const res = await request(app)
        .patch(`/api/tickets/${ticketUserAId}/resolve-indication`)
        .set("Authorization", `Bearer ${userTokenB}`)
        .send({
          comment: "Malicious attempt to resolve another user's ticket",
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("blocks resolution indication with 403 when user has mustChangePassword: true", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketUserAId}/resolve-indication`)
        .set("Authorization", `Bearer ${userWithMustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });
});
