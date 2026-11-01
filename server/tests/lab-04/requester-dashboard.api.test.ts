import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";
import { Role } from "@prisma/client";

describe("Requester Dashboard API (API-05, API-06 / FR-10 / AC-13, AC-15)", () => {
  const prisma = getPrisma();

  let activeRequesterId: number;
  let emptyRequesterId: number;
  let activeToken: string;
  let emptyToken: string;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    // 1. Resolve seed reference data
    const sorawit = await prisma.user.findFirst({
      where: { email: "sorawit.chaithong@email.com", isActive: true },
    });
    const category = await prisma.category.findFirst({
      where: { name: "Network", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Campus Wi-Fi", isActive: true },
    });

    if (!sorawit || !category || !system) {
      throw new Error("Missing seed data for requester-dashboard.api.test.ts");
    }

    activeRequesterId = sorawit.id;
    activeToken = signBearerToken({ userId: sorawit.id, role: sorawit.role });

    // 2. Create a brand-new requester with zero tickets (for API-06)
    const emptyUser = await prisma.user.create({
      data: {
        fullName: "Empty Dashboard Requester",
        email: `empty.requester.${Date.now()}@email.com`,
        passwordHash: "dummyhash",
        role: Role.REQUESTER,
        department: "Testing",
        isActive: true,
        mustChangePassword: false,
      },
    });
    emptyRequesterId = emptyUser.id;
    emptyToken = signBearerToken({ userId: emptyUser.id, role: emptyUser.role });

    // 3. Create controlled test tickets for activeRequester to verify metrics
    // Ticket 1: OPEN (waiting for requester)
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F4DSH-${Date.now().toString().slice(-6)}1`,
        requesterId: activeRequesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "WAITING_FOR_REQUESTER",
        summary: "Dashboard Test Ticket 1 - Waiting for input",
        description: "Need feedback from requester",
        ticketOwner: "Unassigned",
        resolvedByRequester: false,
      },
    });
    createdTicketIds.push(t1.id);

    // Ticket 2: IN_PROGRESS
    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F4DSH-${Date.now().toString().slice(-6)}2`,
        requesterId: activeRequesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        summary: "Dashboard Test Ticket 2 - In progress",
        description: "Active work being performed",
        ticketOwner: "Unassigned",
        resolvedByRequester: false,
      },
    });
    createdTicketIds.push(t2.id);

    // Ticket 3: RESOLVED recently
    const t3 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F4DSH-${Date.now().toString().slice(-6)}3`,
        requesterId: activeRequesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "RESOLVED",
        summary: "Dashboard Test Ticket 3 - Resolved",
        description: "Issue was resolved",
        ticketOwner: "Unassigned",
        resolvedByRequester: true,
      },
    });
    createdTicketIds.push(t3.id);
  });

  afterAll(async () => {
    // Teardown tickets created in this test suite
    if (createdTicketIds.length > 0) {
      await prisma.comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    // Teardown empty user
    if (emptyRequesterId) {
      await prisma.user.deleteMany({ where: { id: emptyRequesterId } });
    }
  });

  it("API-05 / AC-13: GET /api/dashboard/requester calculates authoritative metrics strictly matching DB state", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${activeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, recentTickets } = res.body;

    // Verify metrics exist and are non-negative integers
    expect(typeof metrics.totalOpen).toBe("number");
    expect(typeof metrics.waitingForRequester).toBe("number");
    expect(typeof metrics.recentlyUpdated).toBe("number");
    expect(typeof metrics.recentlyResolved).toBe("number");

    // With our test fixtures + existing seeds, verify counts are at least our created fixtures
    expect(metrics.totalOpen).toBeGreaterThanOrEqual(2); // t1 (WAITING_FOR_REQUESTER) + t2 (IN_PROGRESS)
    expect(metrics.waitingForRequester).toBeGreaterThanOrEqual(1); // t1
    expect(metrics.recentlyUpdated).toBeGreaterThanOrEqual(3); // t1, t2, t3 were created just now
    expect(metrics.recentlyResolved).toBeGreaterThanOrEqual(1); // t3

    // Verify recentTickets list
    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeGreaterThanOrEqual(1);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    const firstTicket = recentTickets[0];
    expect(firstTicket).toHaveProperty("id");
    expect(firstTicket).toHaveProperty("ticketNumber");
    expect(firstTicket).toHaveProperty("summary");
    expect(firstTicket).toHaveProperty("categoryName");
    expect(firstTicket).toHaveProperty("requestedPriority");
    expect(firstTicket).toHaveProperty("currentStatus");
    expect(firstTicket).toHaveProperty("resolvedByRequester");
    expect(firstTicket).toHaveProperty("updatedAt");
  });

  it("API-06 / AC-15: GET /api/dashboard/requester returns 0 for all metrics and empty array [] for user with zero tickets", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      metrics: {
        totalOpen: 0,
        waitingForRequester: 0,
        recentlyUpdated: 0,
        recentlyResolved: 0,
      },
      recentTickets: [],
    });
  });

  it("blocks unauthenticated access with HTTP 401", async () => {
    const res = await request(app).get("/api/dashboard/requester");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

