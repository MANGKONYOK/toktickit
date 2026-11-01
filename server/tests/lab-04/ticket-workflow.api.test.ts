import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("Ticket Workflow, Resolution Gate & Concurrency API (FLOW-01..04 / FR-07..09 / AC-08..12)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let staffAId: number;
  let adminId: number;

  let requesterTokenA: string;
  let requesterTokenB: string;
  let staffTokenA: string;
  let adminToken: string;

  let openTicketId: number;
  let inProgressTicketId: number;
  let closedTicketId: number;
  let cancelledTicketId: number;

  beforeAll(async () => {
    const userA = await prisma.user.findFirst({
      where: { email: "sorawit.chaithong@email.com", isActive: true },
    });
    const userB = await prisma.user.findFirst({
      where: { email: "jane.doe@email.com", isActive: true },
    });
    const itStaffA = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@gmail.com", isActive: true },
    });
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
    });

    const category = await prisma.category.findFirst({
      where: { name: "Software", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Email", isActive: true },
    });

    if (!userA || !userB || !itStaffA || !adminUser || !category || !system) {
      throw new Error("Missing required seed data for ticket-workflow.api.test.ts");
    }

    requesterAId = userA.id;
    requesterBId = userB.id;
    staffAId = itStaffA.id;
    adminId = adminUser.id;

    requesterTokenA = signBearerToken({ userId: userA.id, role: userA.role });
    requesterTokenB = signBearerToken({ userId: userB.id, role: userB.role });
    staffTokenA = signBearerToken({ userId: itStaffA.id, role: itStaffA.role });
    adminToken = signBearerToken({ userId: adminUser.id, role: adminUser.role });

    // 1. Create an OPEN ticket owned by Requester A
    const openTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3OPN-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        summary: "Test Open Ticket for Workflow",
        description: "Email sync issue on mobile app",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
        resolvedByRequester: false,
      },
    });
    openTicketId = openTicket.id;

    // 2. Create an IN_PROGRESS ticket owned by Requester A
    const inProgressTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3INP-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        summary: "Test In-Progress Ticket for Concurrency",
        description: "Database latency investigation",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
        resolvedByRequester: false,
      },
    });
    inProgressTicketId = inProgressTicket.id;

    // 3. Create a CLOSED ticket owned by Requester A
    const closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3CLS-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "CLOSED",
        summary: "Test Closed Ticket for Terminal Locks",
        description: "Completed laptop setup",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
        resolvedByRequester: true,
      },
    });
    closedTicketId = closedTicket.id;

    // 4. Create a CANCELLED ticket owned by Requester A
    const cancelledTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3CAN-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "CANCELLED",
        summary: "Test Cancelled Ticket for Terminal Locks",
        description: "Accidental duplicate request",
        ticketOwner: "Unassigned",
        resolvedByRequester: false,
      },
    });
    cancelledTicketId = cancelledTicket.id;
  });

  afterAll(async () => {
    const ids = [openTicketId, inProgressTicketId, closedTicketId, cancelledTicketId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.comment.deleteMany({
        where: { ticketId: { in: ids } },
      });
      await prisma.actionTaken.deleteMany({
        where: { ticketId: { in: ids } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  describe("FLOW-01: Advisory Requester Resolution Seam (FR-07 / BR-10 / AC-08)", () => {
    it("sets resolvedByRequester = true and logs optional comment while keeping status unchanged", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${openTicketId}/resolve`)
        .set("Authorization", `Bearer ${requesterTokenA}`)
        .send({
          comment: "Problem resolved after clearing browser cookies. Everything works now!",
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.id).toBe(openTicketId);
      expect(res.body.ticket.resolvedByRequester).toBe(true);
      expect(res.body.ticket.status).toBe("OPEN");

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({
        where: { id: openTicketId },
        include: { comments: true },
      });
      expect(dbTicket?.resolvedByRequester).toBe(true);
      expect(dbTicket?.currentStatus).toBe("OPEN"); // Status must NOT advance to RESOLVED
      expect(dbTicket?.comments.some((c) => c.content.includes("clearing browser cookies"))).toBe(true);
    });

    it("rejects attempt to indicate resolution by non-owner with HTTP 404 (Anti-Enumeration BR-14)", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${openTicketId}/resolve`)
        .set("Authorization", `Bearer ${requesterTokenB}`)
        .send({ comment: "Malicious attempt" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("rejects resolution indication attempt by IT Staff with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${openTicketId}/resolve`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({ comment: "Staff attempting advisory indication" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("FLOW-02: Authoritative IT Staff Resolution Gate (FR-07 / BR-09 / AC-09)", () => {
    it("allows IT Staff to formally transition status to RESOLVED via /api/tickets/:id/status", async () => {
      const ticketBefore = await prisma.ticket.findUnique({ where: { id: openTicketId } });
      const res = await request(app)
        .patch(`/api/tickets/${openTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: ticketBefore?.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("RESOLVED");
      expect(res.body.ticket.currentStatus).toBe("RESOLVED");
      // Check spec flat fields per api-spec.md:166-175 (Warning #5)
      expect(res.body.id).toBe(openTicketId);
      expect(res.body.ticketNumber).toBeDefined();
      expect(res.body.currentStatus).toBe("RESOLVED");
      expect(res.body.previousStatus).toBe("OPEN");
      expect(res.body.updatedAt).toBeDefined();

      const dbTicket = await prisma.ticket.findUnique({ where: { id: openTicketId } });
      expect(dbTicket?.currentStatus).toBe("RESOLVED");
    });

    it("rejects Requester attempt to call status transition endpoint with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${requesterTokenA}`)
        .send({ status: "RESOLVED", expectedUpdatedAt: new Date().toISOString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows Administrator to transition status to WAITING_FOR_REQUESTER", async () => {
      const ticketBefore = await prisma.ticket.findUnique({ where: { id: inProgressTicketId } });
      const res = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "WAITING_FOR_REQUESTER",
          expectedUpdatedAt: ticketBefore?.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("WAITING_FOR_REQUESTER");
      expect(res.body.previousStatus).toBe("IN_PROGRESS");
    });
  });

  describe("FLOW-03: Optimistic Concurrency Control (FR-08 / BR-13 / AC-11)", () => {
    it("rejects status transition with HTTP 400 VALIDATION_ERROR when expectedUpdatedAt is omitted", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("expectedUpdatedAt is required");
    });

    it("rejects status transition with HTTP 400 VALIDATION_ERROR when expectedUpdatedAt is an invalid timestamp string", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({ status: "RESOLVED", expectedUpdatedAt: "not-a-valid-date" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("valid ISO-8601 timestamp string");
    });

    it("returns HTTP 409 CONCURRENCY_CONFLICT when expectedUpdatedAt does not match database updatedAt", async () => {
      // 1. Fetch current ticket state
      const ticketBefore = await prisma.ticket.findUnique({ where: { id: inProgressTicketId } });
      expect(ticketBefore).not.toBeNull();
      const originalUpdatedAt = ticketBefore!.updatedAt.toISOString();

      // 2. Simulate concurrent update by another user
      await prisma.ticket.update({
        where: { id: inProgressTicketId },
        data: { currentStatus: "IN_PROGRESS" },
      });

      // 3. Stale client attempts status transition using original (stale) timestamp
      const staleRes = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: originalUpdatedAt,
        });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe("CONCURRENCY_CONFLICT");
      expect(staleRes.body.error.message).toContain("modified by another user");
      expect(staleRes.body.error.details).toBeDefined();
      expect(staleRes.body.error.details.currentStatus).toBe("IN_PROGRESS");
      expect(staleRes.body.error.details.currentUpdatedAt).toBeDefined();

      // 4. Ticket in DB remains IN_PROGRESS (not updated to RESOLVED)
      const ticketAfterFailed = await prisma.ticket.findUnique({ where: { id: inProgressTicketId } });
      expect(ticketAfterFailed?.currentStatus).toBe("IN_PROGRESS");

      // 5. Client reloads latest data and submits with fresh expectedUpdatedAt
      const freshUpdatedAt = ticketAfterFailed!.updatedAt.toISOString();
      const freshRes = await request(app)
        .patch(`/api/tickets/${inProgressTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: freshUpdatedAt,
        });

      expect(freshRes.status).toBe(200);
      expect(freshRes.body.ticket.currentStatus).toBe("RESOLVED");
    });
  });

  describe("FLOW-04: Terminal State Mutability Locks (BR-12 / AC-12)", () => {
    it("rejects recording Action Taken on CLOSED ticket with HTTP 400 TICKET_TERMINAL_LOCKED", async () => {
      const res = await request(app)
        .post(`/api/tickets/${closedTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          actionDateTime: new Date().toISOString(),
          description: "Attempting to record action on closed ticket",
          result: "Should be rejected",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL_LOCKED");
    });

    it("rejects status transition on CLOSED ticket with HTTP 400", async () => {
      const ticketBefore = await prisma.ticket.findUnique({ where: { id: closedTicketId } });
      const res = await request(app)
        .patch(`/api/tickets/${closedTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          status: "OPEN",
          expectedUpdatedAt: ticketBefore?.updatedAt.toISOString() || new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(["INVALID_STATUS_TRANSITION", "TICKET_TERMINAL_LOCKED"]).toContain(res.body.error.code);
    });

    it("rejects indicating problem resolved on CLOSED ticket with HTTP 400", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${closedTicketId}/resolve`)
        .set("Authorization", `Bearer ${requesterTokenA}`)
        .send({ comment: "Already closed ticket" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL_LOCKED");
    });

    it("rejects recording Action Taken on CANCELLED ticket with HTTP 400 TICKET_TERMINAL_LOCKED", async () => {
      const res = await request(app)
        .post(`/api/tickets/${cancelledTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          actionDateTime: new Date().toISOString(),
          description: "Attempting to record action on cancelled ticket",
          result: "Should be rejected",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL_LOCKED");
    });

    it("rejects status transition on CANCELLED ticket with HTTP 400", async () => {
      const ticketBefore = await prisma.ticket.findUnique({ where: { id: cancelledTicketId } });
      const res = await request(app)
        .patch(`/api/tickets/${cancelledTicketId}/status`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          status: "OPEN",
          expectedUpdatedAt: ticketBefore?.updatedAt.toISOString() || new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(["INVALID_STATUS_TRANSITION", "TICKET_TERMINAL_LOCKED"]).toContain(res.body.error.code);
    });
  });
});
