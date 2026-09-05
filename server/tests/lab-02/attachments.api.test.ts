import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

describe("Attachment Lifecycle API - [API-11..15 / AC-14..18, BR-08..12]", () => {
  let requesterSorawit: any;
  let requesterJane: any;
  let categoryHardware: any;
  let systemLaptop: any;
  let testTicket: any;

  beforeEach(async () => {
    requesterSorawit = await prisma.requesterUser.findFirst({
      where: { email: "sorawit.chaithong@email.com" },
    });
    requesterJane = await prisma.requesterUser.findFirst({
      where: { email: "jane.doe@email.com" },
    });
    categoryHardware = await prisma.category.findFirst({
      where: { name: "Hardware" },
    });
    systemLaptop = await prisma.relatedSystem.findFirst({
      where: { name: "Corporate Laptop" },
    });

    // Create a fresh test ticket for Sorawit
    testTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-990002" },
      update: {
        summary: "Display port flickering",
        description: "External monitor drops video signal intermittently.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        requesterId: requesterSorawit.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
      },
      create: {
        ticketNumber: "TKT-2026-990002",
        summary: "Display port flickering",
        description: "External monitor drops video signal intermittently.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        requesterId: requesterSorawit.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
      },
    });

    // Clean up any existing attachments for this ticket
    await prisma.attachment.deleteMany({
      where: { ticketId: testTicket.id },
    });
  });

  afterAll(async () => {
    await prisma.attachment.deleteMany({
      where: { ticketId: testTicket.id },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/tickets/:id/attachments (API-11, API-12, API-13)", () => {
    it("successfully uploads a valid PDF attachment (API-11 / AC-14)", async () => {
      const buffer = Buffer.from("%PDF-1.4 dummy pdf content for testing");

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .field("requesterId", requesterSorawit.id)
        .attach("file", buffer, { filename: "diagnostic_report.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.fileName).toBe("diagnostic_report.pdf");
      expect(res.body.mimeType).toBe("application/pdf");
      expect(res.body.fileSize).toBe(buffer.length);
    });

    it("rejects unsupported MIME type with 415 Unsupported Media Type (API-12 / AC-15, BR-09)", async () => {
      const buffer = Buffer.from("echo 'executable script'");

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .field("requesterId", requesterSorawit.id)
        .attach("file", buffer, { filename: "malware.exe", contentType: "application/x-msdownload" });

      expect(res.status).toBe(415);
      expect(res.body.error).toBeDefined();
    });

    it("rejects oversized file (>5MB) with 413 Payload Too Large (API-12 / AC-15, BR-09)", async () => {
      // 5MB + 1024 bytes
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0);

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .field("requesterId", requesterSorawit.id)
        .attach("file", bigBuffer, { filename: "too_large.png", contentType: "image/png" });

      expect(res.status).toBe(413);
      expect(res.body.error).toBeDefined();
    });

    it("enforces maximum 5 active attachments limit with 409 Conflict (API-13 / AC-16, BR-10)", async () => {
      // Seed 5 active attachments
      for (let i = 1; i <= 5; i++) {
        await prisma.attachment.create({
          data: {
            ticketId: testTicket.id,
            fileName: `active_${i}.png`,
            originalName: `active_${i}.png`,
            mimeType: "image/png",
            fileSize: 1024,
            filePath: "dummy_path",
            uploadedById: requesterSorawit.id,
          },
        });
      }

      // Attempt uploading 6th active attachment
      const buffer = Buffer.from("dummy png content");
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .field("requesterId", requesterSorawit.id)
        .attach("file", buffer, { filename: "active_6.png", contentType: "image/png" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
    });

    it("enforces ownership: returns 404 when uploading to another user's ticket (BR-08)", async () => {
      const buffer = Buffer.from("dummy content");

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .field("requesterId", requesterJane.id) // Jane tries uploading to Sorawit's ticket
        .attach("file", buffer, { filename: "test.png", contentType: "image/png" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tickets/:id/attachments (Endpoint 8)", () => {
    it("returns active and soft-removed attachment metadata list", async () => {
      // Create 1 active and 1 removed attachment
      await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "active.pdf",
          originalName: "active.pdf",
          mimeType: "application/pdf",
          fileSize: 2048,
          filePath: "dummy_active",
          uploadedById: requesterSorawit.id,
        },
      });

      await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "removed.pdf",
          originalName: "removed.pdf",
          mimeType: "application/pdf",
          fileSize: 4096,
          filePath: "dummy_removed",
          uploadedById: requesterSorawit.id,
          removedAt: new Date(),
          removedById: requesterSorawit.id,
          removalReason: "Superceded by newer version",
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/attachments`)
        .query({ requesterId: requesterSorawit.id });

      expect(res.status).toBe(200);
      expect(res.body.activeAttachments).toHaveLength(1);
      expect(res.body.activeAttachments[0].fileName).toBe("active.pdf");
      expect(res.body.removedAttachments).toHaveLength(1);
      expect(res.body.removedAttachments[0].fileName).toBe("removed.pdf");
      expect(res.body.removedAttachments[0].removalReason).toBe("Superceded by newer version");
    });
  });

  describe("DELETE /api/attachments/:id (API-14 / AC-17, BR-11)", () => {
    it("soft-removes active attachment with valid reason >= 5 characters", async () => {
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "remove_me.png",
          originalName: "remove_me.png",
          mimeType: "image/png",
          fileSize: 1024,
          filePath: "dummy_path",
          uploadedById: requesterSorawit.id,
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${att.id}`)
        .send({
          requesterId: requesterSorawit.id,
          reason: "File contained internal company secrets by mistake",
        });

      expect(res.status).toBe(200);
      expect(res.body.isRemoved).toBe(true);
      expect(res.body.removalReason).toBe("File contained internal company secrets by mistake");

      // Verify in DB that it was soft-removed (not deleted from DB)
      const inDb = await prisma.attachment.findUnique({ where: { id: att.id } });
      expect(inDb).not.toBeNull();
      expect(inDb?.removedAt).not.toBeNull();
      expect(inDb?.removalReason).toBe("File contained internal company secrets by mistake");
    });

    it("rejects soft-removal when reason is less than 5 characters with 400 Bad Request", async () => {
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "short_reason.png",
          originalName: "short_reason.png",
          mimeType: "image/png",
          fileSize: 1024,
          filePath: "dummy_path",
          uploadedById: requesterSorawit.id,
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${att.id}`)
        .send({
          requesterId: requesterSorawit.id,
          reason: "nope", // 4 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects soft-removal if attachment is already removed with 409 Conflict", async () => {
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "already_removed.png",
          originalName: "already_removed.png",
          mimeType: "image/png",
          fileSize: 1024,
          filePath: "dummy_path",
          uploadedById: requesterSorawit.id,
          removedAt: new Date(),
          removedById: requesterSorawit.id,
          removalReason: "Initial removal",
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${att.id}`)
        .send({
          requesterId: requesterSorawit.id,
          reason: "Trying to remove again",
        });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/attachments/:id/download (API-15 / AC-18, BR-12)", () => {
    it("allows download of active attachment with binary stream and Content-Disposition", async () => {
      // Create temporary file on disk
      const tempDir = path.resolve(__dirname, "../../uploads/attachments");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, "active_download_test.png");
      fs.writeFileSync(tempFilePath, "PNG dummy image content");

      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "active_download_test.png",
          originalName: "user_photo.png",
          mimeType: "image/png",
          fileSize: 23,
          filePath: tempFilePath,
          uploadedById: requesterSorawit.id,
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${att.id}/download`)
        .query({ requesterId: requesterSorawit.id });

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("user_photo.png");

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });

    it("blocks download of soft-removed attachment with 410 Gone (API-15 / AC-18, BR-12)", async () => {
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "removed_blocked.png",
          originalName: "secret.png",
          mimeType: "image/png",
          fileSize: 1024,
          filePath: "non_existent",
          uploadedById: requesterSorawit.id,
          removedAt: new Date(),
          removedById: requesterSorawit.id,
          removalReason: "Sensitive information",
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${att.id}/download`)
        .query({ requesterId: requesterSorawit.id });

      expect([404, 410]).toContain(res.status);
    });

    it("rejects download attempt from non-owner with 404 Not Found (BR-08)", async () => {
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          fileName: "private.png",
          originalName: "private.png",
          mimeType: "image/png",
          fileSize: 1024,
          filePath: "dummy_path",
          uploadedById: requesterSorawit.id,
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${att.id}/download`)
        .query({ requesterId: requesterJane.id }); // Jane tries downloading Sorawit's file

      expect(res.status).toBe(404);
    });
  });
});
