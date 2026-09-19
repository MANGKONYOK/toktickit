import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("Public Comments API (API-12, API-13 / AC-10, FR-06)", () => {
  const prisma = getPrisma();

  let userAId: number;
  let userBId: number;
  let itStaffId: number;
  let userTokenA: string;
  let userTokenB: string;
  let itStaffToken: string;
  let mustChangePasswordToken: string;
  let ticketId: number;

  beforeAll(async () => {
    const userA = await prisma.user.findFirst({
      where: { email: "sorawit.chaithong@email.com", isActive: true },
    });
    const userB = await prisma.user.findFirst({
      where: { email: "jane.doe@email.com", isActive: true },
    });
    const itStaff = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@email.com", isActive: true },
    });
    const userMustChange = await prisma.user.findFirst({
      where: { email: "bob.smith@email.com", isActive: true },
    });
    const category = await prisma.category.findFirst({
      where: { name: "Network", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Campus Wi-Fi", isActive: true },
    });

    if (!userA || !userB || !itStaff || !userMustChange || !category || !system) {
      throw new Error("Missing required seed data for comments-notes.api.test.ts");
    }

    userAId = userA.id;
    userBId = userB.id;
    itStaffId = itStaff.id;

    userTokenA = signBearerToken({ userId: userA.id, role: userA.role });
    userTokenB = signBearerToken({ userId: userB.id, role: userB.role });
    itStaffToken = signBearerToken({ userId: itStaff.id, role: itStaff.role });
    mustChangePasswordToken = signBearerToken({
      userId: userMustChange.id,
      role: userMustChange.role,
    });

    // Create a known ticket owned by User A
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F3COMM-${Date.now().toString().slice(-6)}`,
        requesterId: userAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "OPEN",
        summary: "Wi-Fi connection drops in Building 3",
        description: "Signal is lost when moving between floors 2 and 3.",
        ticketOwner: "Unassigned",
        resolvedByRequester: false,
      },
    });

    ticketId = ticket.id;
  });

  describe("POST /api/tickets/:id/comments", () => {
    it("API-12 / AC-10: Requester successfully posts public comment on owned ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          content: "The connection dropped again today at 10:30 AM on Floor 2.",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comment");
      expect(res.body.comment.ticketId).toBe(ticketId);
      expect(res.body.comment.authorId).toBe(userAId);
      expect(res.body.comment.authorName).toBe("Sorawit Chaithong");
      expect(res.body.comment.authorRole).toBe("REQUESTER");
      expect(res.body.comment.content).toBe(
        "The connection dropped again today at 10:30 AM on Floor 2."
      );
      expect(res.body.comment).toHaveProperty("createdAt");
    });

    it("API-13 / AC-10: IT Staff successfully posts public comment on any ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          content: "We checked AP-03-02 on Floor 2 and rebooted the controller.",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comment");
      expect(res.body.comment.ticketId).toBe(ticketId);
      expect(res.body.comment.authorId).toBe(itStaffId);
      expect(res.body.comment.authorName).toBe("Piti Srisongkram");
      expect(res.body.comment.authorRole).toBe("IT_STAFF");
      expect(res.body.comment.content).toBe(
        "We checked AP-03-02 on Floor 2 and rebooted the controller."
      );
    });

    it("rejects comment submission on another user's ticket with HTTP 404 (AC-09 / AC-10)", async () => {
      // User B attempts to comment on User A's ticket
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${userTokenB}`)
        .send({
          content: "Unauthorized comment attempt",
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("rejects empty or whitespace-only comment with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          content: "   ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("blocks comment submission with 403 when user has mustChangePassword: true", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${mustChangePasswordToken}`)
        .send({
          content: "Attempting to comment while password change pending",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("GET /api/tickets/:id/comments", () => {
    it("lists public comments in chronological order", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${userTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("comments");
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.comments.length).toBeGreaterThanOrEqual(2);

      // Verify chronological ordering
      const timestamps = res.body.comments.map((c: any) => new Date(c.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it("returns HTTP 404 when requester attempts to list comments on another user's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${userTokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("allows IT Staff to list comments on any ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.comments)).toBe(true);
    });
  });
});
