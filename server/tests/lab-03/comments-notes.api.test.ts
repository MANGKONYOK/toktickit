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

  describe("Private Internal Notes API (API-23, API-24 / AC-19, FR-14, BR-15)", () => {
    let createdNoteId: number;

    it("API-23 (AC-19): allows IT Staff to create private internal note with HTTP 201 Created", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          content: "Confidential note: core switch SFP module replaced on port 24.",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("note");
      const { note } = res.body;

      expect(note.ticketId).toBe(ticketId);
      expect(note.authorId).toBe(itStaffId);
      expect(note.authorRole).toBe("IT_STAFF");
      expect(note.content).toBe("Confidential note: core switch SFP module replaced on port 24.");
      expect(note.createdAt).toBeDefined();

      createdNoteId = note.id;

      // Verify in DB
      const dbNote = await prisma.internalNote.findUnique({ where: { id: createdNoteId } });
      expect(dbNote).not.toBeNull();
      expect(dbNote?.authorId).toBe(itStaffId);
    });

    it("allows IT Staff to add note via /api/tickets/:id/internal-notes alias", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/internal-notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          content: "Secondary alias test note",
        });

      expect(res.status).toBe(201);
      expect(res.body.note.content).toBe("Secondary alias test note");
    });

    it("API-24 (AC-19): strictly rejects Requester from creating internal note with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          content: "Requester trying to write internal note",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("API-24 (AC-19): strictly rejects Requester from creating note on alias route with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/internal-notes`)
        .set("Authorization", `Bearer ${userTokenA}`)
        .send({
          content: "Requester trying to write internal note on alias",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("API-24 (AC-19): strictly rejects Requester from reading internal notes with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${userTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("API-24 (AC-19): strictly rejects Requester from reading notes on alias route with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/internal-notes`)
        .set("Authorization", `Bearer ${userTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows IT Staff to list internal notes in chronological order", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("notes");
      expect(Array.isArray(res.body.notes)).toBe(true);
      expect(res.body.notes.length).toBeGreaterThanOrEqual(2);

      const timestamps = res.body.notes.map((n: any) => new Date(n.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it("rejects empty or whitespace-only internal note with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          content: "    ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects oversized internal note (>2000 chars) with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          content: "a".repeat(2001),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unauthenticated internal note creation with HTTP 401 Unauthorized", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/notes`)
        .send({ content: "Unauthenticated note" });

      expect(res.status).toBe(401);
    });

    it("returns HTTP 404 for non-existent ticket ID on internal note operations", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/9999999/notes")
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ content: "Valid note text" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });
  });
});

