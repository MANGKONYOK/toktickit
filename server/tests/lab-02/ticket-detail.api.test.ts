import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { PrismaClient } from "@prisma/client";
import { signBearerToken } from "../../src/middleware/auth.js";

const prisma = new PrismaClient();

describe("Ticket Detail API (GET /api/tickets/:id) - [API-09 / AC-13, FR-10]", () => {
  let requesterSorawit: any;
  let requesterJane: any;
  let categoryHardware: any;
  let systemLaptop: any;
  let testTicket: any;
  let sorawitToken: string;
  let janeToken: string;

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

    sorawitToken = signBearerToken({ userId: requesterSorawit.id, role: "REQUESTER" });
    janeToken = signBearerToken({ userId: requesterJane.id, role: "REQUESTER" });

    // Create a known ticket for Sorawit
    testTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-990001" },
      update: {
        summary: "Battery overheating during meetings",
        description: "Laptop battery gets extremely hot when running video conference tools.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        requesterId: requesterSorawit.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
      },
      create: {
        ticketNumber: "TKT-2026-990001",
        summary: "Battery overheating during meetings",
        description: "Laptop battery gets extremely hot when running video conference tools.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        requesterId: requesterSorawit.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
      },
    });
  });

  it("returns 200 OK with full ticket details, requester, category, and system for owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicket.id}`)
      .set("Authorization", `Bearer ${sorawitToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toBe("TKT-2026-990001");
    expect(res.body.summary).toBe("Battery overheating during meetings");
    expect(res.body.description).toContain("gets extremely hot");
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.ticketOwner).toBe("Unassigned");

    // Relations
    expect(res.body.requester).toBeDefined();
    expect(res.body.requester.id).toBe(requesterSorawit.id);
    expect(res.body.requester.fullName).toBe("Sorawit Chaithong");
    expect(res.body.category.name).toBe("Hardware");
    expect(res.body.relatedSystem.name).toBe("Corporate Laptop");
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("authenticates via session and ignores legacy x-requester-id header (AC-08, BR-06)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicket.id}`)
      .set("Authorization", `Bearer ${sorawitToken}`)
      .set("x-requester-id", String(requesterJane.id));

    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toBe("TKT-2026-990001");
  });

  it("rejects unauthenticated request without session with 401 Unauthorized", async () => {
    const res = await request(app).get(`/api/tickets/${testTicket.id}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("enforces strict ownership isolation (BR-08 / AC-03): returns 404 when requested by a different requester", async () => {
    // Jane Doe attempts to access Sorawit's ticket
    const res = await request(app)
      .get(`/api/tickets/${testTicket.id}`)
      .set("Authorization", `Bearer ${janeToken}`);

    expect(res.status).toBe(404);
    expect(res.body.ticketNumber).toBeUndefined();
  });

  it("anti-spoofing (AC-03): session identity takes absolute precedence over query requesterId", async () => {
    // Attacker authenticated as Jane Doe attempts to spoof Sorawit via query parameter
    const res = await request(app)
      .get(`/api/tickets/${testTicket.id}`)
      .set("Authorization", `Bearer ${janeToken}`)
      .query({ requesterId: requesterSorawit.id });

    // Must be rejected as 404 because Jane does not own the ticket, despite ?requesterId=Sorawit
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("returns 404 when ticket ID does not exist", async () => {
    const res = await request(app)
      .get("/api/tickets/9999999")
      .set("Authorization", `Bearer ${sorawitToken}`);

    expect(res.status).toBe(404);
  });
});
