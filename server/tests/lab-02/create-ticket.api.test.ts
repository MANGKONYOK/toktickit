import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("POST /api/tickets (API-01, API-02, API-03 / AC-01, AC-05, BR-01, BR-02, BR-05)", () => {
  let activeRequesterId: number;
  let activeCategoryId: number;
  let activeSystemId: number;
  let inactiveRequesterId: number;
  let activeToken: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    // Fetch seeded active reference data
    const requester = await prisma.requesterUser.findFirst({
      where: { isActive: true },
    });
    const inactiveRequester = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    const category = await prisma.category.findFirst({
      where: { isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true },
    });

    if (!requester || !category || !system || !inactiveRequester) {
      throw new Error("Seed data missing for create-ticket API test");
    }

    activeRequesterId = requester.id;
    inactiveRequesterId = inactiveRequester.id;
    activeCategoryId = category.id;
    activeSystemId = system.id;

    activeToken = signBearerToken({ userId: activeRequesterId, role: "REQUESTER" });
  });

  it("API-01 / AC-01: successfully creates a ticket with valid inputs and default lifecycle state", async () => {
    const payload = {
      requesterId: activeRequesterId,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      requestedPriority: "HIGH",
      summary: "Laptop screen flickering intermittently",
      description:
        "The laptop display flickers randomly when moved or adjusted during normal usage.",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.requesterId).toBe(activeRequesterId);
    expect(res.body.categoryId).toBe(activeCategoryId);
    expect(res.body.relatedSystemId).toBe(activeSystemId);
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.itPriority).toBe("HIGH"); // BR-02: itPriority defaults to requestedPriority
    expect(res.body.currentStatus).toBe("NEW"); // BR-02: initial status is NEW
    expect(res.body.ticketOwner).toBe("Unassigned"); // BR-02: ticketOwner is Unassigned
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  it("API-02 / AC-05: rejects invalid summary and description with 400 and structured fieldErrors", async () => {
    const invalidPayload = {
      requesterId: activeRequesterId,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      requestedPriority: "MEDIUM",
      summary: "abc", // < 5 characters
      description: "too short", // < 10 characters
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.fieldErrors)).toBe(true);

    const errorFields = res.body.error.fieldErrors.map((e: any) => e.field);
    expect(errorFields).toContain("summary");
    expect(errorFields).toContain("description");
  });

  it("API-02 / AC-05: returns 400 Bad Request instead of 500 when payload is null", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send(null as any);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-02 / AC-05: returns 400 MALFORMED_JSON instead of Express HTML stack trace when JSON syntax is invalid", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .set("Content-Type", "application/json")
      .send('{"summary":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_JSON");
    expect(res.body.error).toHaveProperty("correlationId");
  });

  it("API-01 / FR-05: rejects unauthenticated requests with 401 and enforces session identity over legacy headers", async () => {
    const payloadWithoutBodyRequester = {
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      summary: "Testing x-requester-id header duality support",
      description: "Detailed description testing header duality support in API.",
    };

    // Unauthenticated call with legacy header must be rejected with 401
    const unauthRes = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", String(activeRequesterId))
      .send(payloadWithoutBodyRequester);

    expect(unauthRes.status).toBe(401);

    // Authenticated call binds to session user regardless of legacy header
    const authRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .set("x-requester-id", "999999")
      .send(payloadWithoutBodyRequester);

    expect(authRes.status).toBe(201);
    expect(authRes.body.requesterId).toBe(activeRequesterId);
  });

  it("API-03 / AC-05: rejects non-existent or inactive category/system with 404 Not Found", async () => {
    const payloadWithInvalidFk = {
      categoryId: 999999, // Non-existent
      relatedSystemId: activeSystemId,
      requestedPriority: "MEDIUM",
      summary: "Valid summary for ticket testing",
      description: "Valid description body for ticket testing purposes.",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send(payloadWithInvalidFk);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("API-03 / AC-05: rejects unauthenticated or inactive user requests with 401 Unauthorized", async () => {
    const inactiveToken = signBearerToken({ userId: inactiveRequesterId, role: "REQUESTER" });
    const payload = {
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      summary: "Testing inactive requester rejection",
      description: "Detailed description testing inactive requester rejection.",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${inactiveToken}`)
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});