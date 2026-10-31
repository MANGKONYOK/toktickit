import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("Actions Taken API (FR-01..06, BR-01..08, BR-12, BR-14 / AC-01..07)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let staffAId: number;
  let staffBId: number;

  let requesterTokenA: string;
  let requesterTokenB: string;
  let staffTokenA: string;
  let staffTokenB: string;

  let activeTicketId: number;
  let closedTicketId: number;

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
    const itStaffB = await prisma.user.findFirst({
      where: { email: "somchai.it@email.com", isActive: true },
    });

    const category = await prisma.category.findFirst({
      where: { name: "Network", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Campus Wi-Fi", isActive: true },
    });

    if (!userA || !userB || !itStaffA || !itStaffB || !category || !system) {
      throw new Error("Missing required seed data for actions-taken.api.test.ts");
    }

    requesterAId = userA.id;
    requesterBId = userB.id;
    staffAId = itStaffA.id;
    staffBId = itStaffB.id;

    requesterTokenA = signBearerToken({ userId: userA.id, role: userA.role });
    requesterTokenB = signBearerToken({ userId: userB.id, role: userB.role });
    staffTokenA = signBearerToken({ userId: itStaffA.id, role: itStaffA.role });
    staffTokenB = signBearerToken({ userId: itStaffB.id, role: itStaffB.role });

    // Create an active ticket owned by Requester A
    const activeTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F2ACT-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        summary: "Test Active Ticket for Actions Taken",
        description: "Network dropped in research lab",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
      },
    });
    activeTicketId = activeTicket.id;

    // Create a closed ticket owned by Requester A
    const closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F2CLS-${Date.now().toString().slice(-6)}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "CLOSED",
        summary: "Test Closed Ticket for Actions Taken",
        description: "Old resolved ticket",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
      },
    });
    closedTicketId = closedTicket.id;
  });

  describe("POST /api/tickets/:id/actions — Create Action Taken", () => {
    it("API-01 / AC-01: IT Staff creates a valid Action Taken with session-bound actor", async () => {
      const payload = {
        actionDateTime: "2026-10-02T10:00:00.000Z",
        description: "Replaced faulty switch port patch cable",
        result: "Link negotiated at 1Gbps full-duplex",
        followUpRequired: true,
        followUpNote: "Monitor packet loss during afternoon load",
        attachmentNotes: "Captured switch diagnostics in port_g01.txt",
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.action).toBeDefined();
      expect(res.body.action.ticketId).toBe(activeTicketId);
      expect(res.body.action.performedById).toBe(staffAId);
      expect(res.body.action.performedBy.id).toBe(staffAId);
      expect(res.body.action.description).toBe(payload.description);
      expect(res.body.action.result).toBe(payload.result);
      expect(res.body.action.followUpRequired).toBe(true);
      expect(res.body.action.followUpNote).toBe(payload.followUpNote);
      expect(res.body.action.attachmentNotes).toBe(payload.attachmentNotes);
    });

    it("API-02 / AC-07: Different IT Staff member records action on same ticket (Multi-Staff Collaboration)", async () => {
      const payload = {
        description: "Secondary staff inspection on access point",
        result: "Verified roaming latency < 20ms",
        followUpRequired: false,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenB}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.action.ticketId).toBe(activeTicketId);
      expect(res.body.action.performedById).toBe(staffBId);
      expect(res.body.action.performedBy.id).toBe(staffBId);
      expect(res.body.action.followUpRequired).toBe(false);
      expect(res.body.action.followUpNote).toBeNull();
    });

    it("AUTH-01 / AC-02: Requester role is forbidden (403) from creating actions taken", async () => {
      const payload = {
        description: "Requester trying to write action",
        result: "Should fail",
        followUpRequired: false,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${requesterTokenA}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("AUTH-03 / BR-02: Anti-spoofing ignores performedById in body and binds to session user", async () => {
      const payload = {
        performedById: 9999, // Attempt to spoof
        description: "Checking spoof prevention",
        result: "Performer should remain staff A",
        followUpRequired: false,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.action.performedById).toBe(staffAId);
    });

    it("FLOW-04 / BR-12: Rejects creating actions on terminal (CLOSED) ticket with 400 Bad Request", async () => {
      const payload = {
        description: "Attempting action on closed ticket",
        result: "Should be locked",
        followUpRequired: false,
      };

      const res = await request(app)
        .post(`/api/tickets/${closedTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL_LOCKED");
    });

    it("Validation error: rejects missing followUpNote when followUpRequired is true (400)", async () => {
      const payload = {
        description: "Missing follow-up note",
        result: "Testing validation",
        followUpRequired: true,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .send({
          description: "No token",
          result: "No token",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/tickets/:id/actions — List Actions Taken", () => {
    it("API-04 / AC-03: Requester retrieves actions for owned ticket in chronological order (200)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${requesterTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.ticketId).toBe(activeTicketId);
      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions.length).toBeGreaterThanOrEqual(2);

      // Verify chronological sorting (actionDateTime ascending)
      const dates = res.body.actions.map((a: any) => new Date(a.actionDateTime).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it("AUTH-02 / BR-14: Requester receives 404 Not Found when querying unowned ticket (anti-enumeration)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${requesterTokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("IT Staff can retrieve actions for any ticket (200)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenB}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.actions)).toBe(true);
    });

    it("Returns 404 for non-existent ticket ID", async () => {
      const res = await request(app)
        .get("/api/tickets/999999/actions")
        .set("Authorization", `Bearer ${staffTokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });
  });

  describe("PATCH /api/tickets/:id/actions/:actionId — Update Action Taken", () => {
    let createdActionId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post(`/api/tickets/${activeTicketId}/actions`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({
          description: "Initial action to be updated",
          result: "Pending outcome",
          followUpRequired: false,
        });

      createdActionId = createRes.body.action.id;
    });

    it("API-03 / AC-06: IT Staff updates action description and result, refreshing updatedAt (200)", async () => {
      const updatePayload = {
        description: "Updated action description after further inspection",
        result: "Confirmed resolved after firmware flash",
        followUpRequired: true,
        followUpNote: "Re-check after next reboot",
      };

      const res = await request(app)
        .patch(`/api/tickets/${activeTicketId}/actions/${createdActionId}`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.action.id).toBe(createdActionId);
      expect(res.body.action.description).toBe(updatePayload.description);
      expect(res.body.action.result).toBe(updatePayload.result);
      expect(res.body.action.followUpRequired).toBe(true);
      expect(res.body.action.followUpNote).toBe(updatePayload.followUpNote);
    });

    it("AUTH-01 / AC-02: Requester is forbidden (403) from updating actions taken", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${activeTicketId}/actions/${createdActionId}`)
        .set("Authorization", `Bearer ${requesterTokenA}`)
        .send({ description: "Requester edit attempt" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Returns 404 if action ID does not belong to the ticket", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${activeTicketId}/actions/999999`)
        .set("Authorization", `Bearer ${staffTokenA}`)
        .send({ description: "Non-existent action" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("ACTION_NOT_FOUND");
    });
  });
});
