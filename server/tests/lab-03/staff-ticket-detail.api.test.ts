import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";
import { Role, Priority, TicketStatus } from "@prisma/client";

describe("Staff Ticket Detail & Lifecycle APIs (API-18..22 / AC-15..18, BR-12..14)", () => {
  const prisma = getPrisma();

  let aliceRequester: any;
  let pitiStaff: any;
  let somchaiStaff: any;
  let adminUser: any;
  let category: any;
  let system: any;

  let requesterToken: string;
  let staffToken: string;
  let otherStaffToken: string;
  let adminToken: string;

  let testTicket: any;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    aliceRequester = await prisma.user.findFirst({
      where: { email: "alice.johnson@email.com", isActive: true },
    });
    pitiStaff = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@email.com", isActive: true },
    });
    somchaiStaff = await prisma.user.findFirst({
      where: { email: "somchai.it@email.com", isActive: true },
    });
    adminUser = await prisma.user.findFirst({
      where: { email: "admin.toktickit@email.com", isActive: true },
    });
    category = await prisma.category.findFirst({
      where: { name: "Network", isActive: true },
    });
    system = await prisma.relatedSystem.findFirst({
      where: { name: "Campus Wi-Fi", isActive: true },
    });

    if (!aliceRequester || !pitiStaff || !somchaiStaff || !adminUser || !category || !system) {
      throw new Error("Missing required seed data for staff-ticket-detail.api.test.ts");
    }

    requesterToken = signBearerToken({ userId: aliceRequester.id, role: aliceRequester.role });
    staffToken = signBearerToken({ userId: pitiStaff.id, role: pitiStaff.role });
    otherStaffToken = signBearerToken({ userId: somchaiStaff.id, role: somchaiStaff.role });
    adminToken = signBearerToken({ userId: adminUser.id, role: adminUser.role });

    // Create a fresh test ticket starting in NEW status
    testTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F5TEST-${Date.now().toString().slice(-6)}`,
        requesterId: aliceRequester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        currentStatus: TicketStatus.NEW,
        summary: "Staff detail integration test ticket",
        description: "Testing staff operational controls and lifecycle transitions",
        ticketOwner: "Unassigned",
        ticketOwnerId: null,
      },
    });
    createdTicketIds.push(testTicket.id);

    // Add a public comment and an internal note to verify aggregation in detail endpoint
    await prisma.comment.create({
      data: {
        ticketId: testTicket.id,
        authorId: aliceRequester.id,
        content: "Public comment from requester",
      },
    });

    await prisma.internalNote.create({
      data: {
        ticketId: testTicket.id,
        authorId: pitiStaff.id,
        content: "Internal note for operational investigation",
      },
    });
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  // -------------------------------------------------------------------------
  // API-18 (AC-15): GET /api/staff/tickets/:id
  // -------------------------------------------------------------------------
  describe("API-18 (AC-15): GET /api/staff/tickets/:id", () => {
    it("returns 200 OK with complete operational payload for IT Staff", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ticket");
      const { ticket } = res.body;

      expect(ticket.id).toBe(testTicket.id);
      expect(ticket.ticketNumber).toBe(testTicket.ticketNumber);
      expect(ticket.summary).toBe("Staff detail integration test ticket");
      expect(ticket.requester.id).toBe(aliceRequester.id);
      expect(ticket.category.name).toBe("Network");
      expect(ticket.relatedSystem.name).toBe("Campus Wi-Fi");
      expect(ticket.currentStatus).toBe(TicketStatus.NEW);
      expect(ticket.itPriority).toBe(Priority.MEDIUM);

      // Verify comments and internal notes are aggregated
      expect(Array.isArray(ticket.comments)).toBe(true);
      expect(ticket.comments.length).toBe(1);
      expect(ticket.comments[0].content).toBe("Public comment from requester");

      expect(Array.isArray(ticket.internalNotes)).toBe(true);
      expect(ticket.internalNotes.length).toBe(1);
      expect(ticket.internalNotes[0].content).toBe("Internal note for operational investigation");
      expect(ticket.internalNotes[0].authorName).toBe(pitiStaff.fullName);
    });

    it("returns 200 OK for Administrator", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.id).toBe(testTicket.id);
    });

    it("rejects Requester access with HTTP 403 Forbidden (RBAC security)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated request with HTTP 401 Unauthorized", async () => {
      const res = await request(app).get(`/api/staff/tickets/${testTicket.id}`);
      expect(res.status).toBe(401);
    });

    it("returns 404 Not Found for non-existent ticket ID", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/9999999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // API-19 (AC-16): PATCH /api/staff/tickets/:id/assign
  // -------------------------------------------------------------------------
  describe("API-19 (AC-16): PATCH /api/staff/tickets/:id/assign", () => {
    it("allows IT Staff to claim ticket ownership for themselves", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ticketOwnerId: pitiStaff.id });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ticketOwnerId).toBe(pitiStaff.id);
      expect(res.body.ticket.assignedOwnerName).toBe(pitiStaff.fullName);

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.ticketOwnerId).toBe(pitiStaff.id);
      expect(dbTicket?.ticketOwner).toBe(pitiStaff.fullName);
    });

    it("allows reassigning ticket to another active IT Staff member", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ticketOwnerId: somchaiStaff.id });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ticketOwnerId).toBe(somchaiStaff.id);
      expect(res.body.ticket.assignedOwnerName).toBe(somchaiStaff.fullName);
    });

    it("allows unassigning ticket by passing ticketOwnerId: null", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ticketOwnerId: null });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ticketOwnerId).toBeNull();
      expect(res.body.ticket.assignedOwnerName).toBeNull();

      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.ticketOwnerId).toBeNull();
      expect(dbTicket?.ticketOwner).toBe("Unassigned");
    });

    it("rejects assignment to a user with role REQUESTER with 400 INVALID_ASSIGNEE (BR-12)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ticketOwnerId: aliceRequester.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
    });

    it("rejects assignment when ticketOwnerId is missing or invalid type", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects Requester access with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assign`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ ticketOwnerId: pitiStaff.id });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-20 (AC-17): PATCH /api/staff/tickets/:id/priority
  // -------------------------------------------------------------------------
  describe("API-20 (AC-17): PATCH /api/staff/tickets/:id/priority", () => {
    it("updates operational itPriority independently of requestedPriority", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.itPriority).toBe("URGENT");

      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.itPriority).toBe(Priority.URGENT);
      expect(dbTicket?.requestedPriority).toBe(Priority.MEDIUM); // Unchanged
    });

    it("rejects invalid priority value with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "SUPER_URGENT" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects Requester modification with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ itPriority: "LOW" });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-21, API-22 (AC-18): PATCH /api/staff/tickets/:id/status
  // -------------------------------------------------------------------------
  describe("API-21, API-22 (AC-18): PATCH /api/staff/tickets/:id/status", () => {
    it("API-22 (AC-18): rejects invalid status transition (NEW -> IN_PROGRESS) with 400 INVALID_STATUS_TRANSITION", async () => {
      // Current ticket status is NEW
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res.body.error.message).toContain("Cannot transition status from NEW to IN_PROGRESS");
    });

    it("API-21 (AC-18): allows valid status transition (NEW -> OPEN)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("OPEN");
      expect(res.body.ticket.currentStatus).toBe("OPEN");

      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.currentStatus).toBe(TicketStatus.OPEN);
    });

    it("advances status from OPEN -> IN_PROGRESS", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("IN_PROGRESS");
    });

    it("advances status from IN_PROGRESS -> RESOLVED", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("RESOLVED");
    });

    it("advances status from RESOLVED -> CLOSED (Terminal state)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("CLOSED");
    });

    it("rejects any further transition once ticket is CLOSED (Terminal state)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("rejects invalid status string with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "NON_EXISTENT_STATUS" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects Requester access with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(403);
    });
  });
});
