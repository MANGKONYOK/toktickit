import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets (API-06, API-07, API-08 / AC-03, AC-07, AC-08, AC-09, AC-10, FR-06, FR-07, FR-08)", () => {
  let userAId: number;
  let userBId: number;
  let inactiveUserId: number;
  let catHardwareId: number;
  let catNetworkId: number;
  let systemLaptopId: number;
  let systemVpnId: number;

  beforeAll(async () => {
    const prisma = getPrisma();

    // Fetch dedicated active test users (John Doe & Jane Doe) to avoid parallel conflict with create-ticket tests
    const userA = await prisma.requesterUser.findFirst({
      where: { email: "john.doe@email.com", isActive: true },
    });
    const userB = await prisma.requesterUser.findFirst({
      where: { email: "jane.doe@email.com", isActive: true },
    });
    const inactive = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    const catHardware = await prisma.category.findFirst({
      where: { name: "Hardware" },
    });
    const catNetwork = await prisma.category.findFirst({
      where: { name: "Network" },
    });
    const sysLaptop = await prisma.relatedSystem.findFirst({
      where: { name: "Corporate Laptop" },
    });
    const sysVpn = await prisma.relatedSystem.findFirst({
      where: { name: "VPN" },
    });

    if (!userA || !userB || !inactive || !catHardware || !catNetwork || !sysLaptop || !sysVpn) {
      throw new Error("Required seed data missing for my-tickets test");
    }

    userAId = userA.id;
    userBId = userB.id;
    inactiveUserId = inactive.id;
    catHardwareId = catHardware.id;
    catNetworkId = catNetwork.id;
    systemLaptopId = sysLaptop.id;
    systemVpnId = sysVpn.id;

    // Clean any prior test tickets to guarantee predictable test counts and uniqueness
    await prisma.ticket.deleteMany({
      where: {
        OR: [
          { ticketNumber: { startsWith: "TKT-2026-9" } },
          { requesterId: { in: [userAId, userBId] } },
        ],
      },
    });

    // Seed 3 distinct tickets for User A
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900001",
        requesterId: userAId,
        categoryId: catHardwareId,
        relatedSystemId: systemLaptopId,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        summary: "Laptop keyboard keys sticking frequently",
        description: "Spacebar and enter keys do not bounce back properly.",
        ticketOwner: "Unassigned",
        createdAt: new Date("2026-02-01T10:00:00Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900002",
        requesterId: userAId,
        categoryId: catNetworkId,
        relatedSystemId: systemVpnId,
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        currentStatus: "IN_PROGRESS",
        summary: "VPN client disconnects every 5 minutes",
        description: "Cannot maintain connection to internal corporate subnets.",
        ticketOwner: "IT Staff Member",
        createdAt: new Date("2026-02-02T11:00:00Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900003",
        requesterId: userAId,
        categoryId: catHardwareId,
        relatedSystemId: systemLaptopId,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "RESOLVED",
        summary: "External monitor cable request",
        description: "Need a DisplayPort to HDMI cable for second screen.",
        ticketOwner: "IT Staff Member",
        createdAt: new Date("2026-02-03T12:00:00Z"),
      },
    });

    // Seed 1 distinct ticket for User B
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900004",
        requesterId: userBId,
        categoryId: catNetworkId,
        relatedSystemId: systemVpnId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        summary: "Campus Wi-Fi unstable in building 3",
        description: "Intermittent packet loss and high latency.",
        ticketOwner: "Unassigned",
        createdAt: new Date("2026-02-04T13:00:00Z"),
      },
    });
  });

  // -------------------------------------------------------------------------
  // API-08: Multi-user Ownership Isolation (AC-03 / FR-06)
  // -------------------------------------------------------------------------
  describe("API-08: Multi-user Ownership Isolation", () => {
    it("returns ONLY tickets belonging to the specified requesterId", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tickets");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.tickets.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);

      // Verify every returned ticket belongs to User A
      for (const t of res.body.tickets) {
        expect(t.requesterId).toBe(userAId);
        expect(t.requesterId).not.toBe(userBId);
      }
    });

    it("returns ONLY User B tickets when requested by User B", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userBId });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].ticketNumber).toBe("TKT-2026-900004");
      expect(res.body.tickets[0].requesterId).toBe(userBId);
    });

    it("supports requester identity via x-requester-id header fallback", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", String(userBId));

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].requesterId).toBe(userBId);
    });

    it("enforces header authority and prevents spoofing: sending User A's header with ?requesterId=User_B returns ONLY User A's tickets (AC-03)", async () => {
      // User A (John Doe) sends authenticated/simulated header for User A,
      // but maliciously appends query param ?requesterId=User_B (Jane Doe)
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", String(userAId))
        .query({ requesterId: userBId });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(3); // User A has 3 tickets
      for (const t of res.body.tickets) {
        expect(t.requesterId).toBe(userAId);
        expect(t.requesterId).not.toBe(userBId);
      }
    });

    it("omits sensitive requester email and department from list rows", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", String(userAId));

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThan(0);
      const first = res.body.tickets[0];
      expect(first.requester).toBeDefined();
      expect(first.requester.id).toBe(userAId);
      expect(first.requester.fullName).toBeDefined();
      expect(first.requester.email).toBeUndefined();
      expect(first.requester.department).toBeUndefined();
    });

    it("returns 400 Bad Request when requesterId is missing", async () => {
      const res = await request(app).get("/api/tickets");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors).toHaveProperty("requesterId");
    });

    it("returns 404 Not Found when requester does not exist or is inactive", async () => {
      const resInactive = await request(app)
        .get("/api/tickets")
        .query({ requesterId: inactiveUserId });

      expect(resInactive.status).toBe(404);
      expect(resInactive.body.error.code).toBe("NOT_FOUND");

      const resNonExistent = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 999999 });

      expect(resNonExistent.status).toBe(404);
      expect(resNonExistent.body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // API-06: Search & Multi-filter Combination (AC-07, AC-08 / FR-07)
  // -------------------------------------------------------------------------
  describe("API-06: Search & Multi-filter Combination", () => {
    it("filters tickets by case-insensitive substring on summary", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, search: "vpn" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].summary).toContain("VPN client disconnects");
    });

    it("filters tickets by substring on ticketNumber", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, search: "900003" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].ticketNumber).toBe("TKT-2026-900003");
    });

    it("filters tickets by categoryId", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, categoryId: catHardwareId });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      for (const t of res.body.tickets) {
        expect(t.categoryId).toBe(catHardwareId);
      }
    });

    it("filters tickets by requestedPriority", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, requestedPriority: "HIGH" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].requestedPriority).toBe("HIGH");
    });

    it("filters tickets by currentStatus", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, status: "RESOLVED" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].currentStatus).toBe("RESOLVED");
    });

    it("filters tickets by combining Category + Priority + Status (multi-filter)", async () => {
      const resMatch = await request(app)
        .get("/api/tickets")
        .query({
          requesterId: userAId,
          categoryId: catHardwareId,
          requestedPriority: "HIGH",
          status: "NEW",
        });

      expect(resMatch.status).toBe(200);
      expect(resMatch.body.tickets.length).toBe(1);
      expect(resMatch.body.tickets[0].ticketNumber).toBe("TKT-2026-900001");

      // No match when one criterion differs
      const resNoMatch = await request(app)
        .get("/api/tickets")
        .query({
          requesterId: userAId,
          categoryId: catHardwareId,
          requestedPriority: "URGENT",
          status: "NEW",
        });

      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.tickets.length).toBe(0);
      expect(resNoMatch.body.pagination.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // API-07: Custom Sorting & Pagination (AC-09, AC-10 / FR-08)
  // -------------------------------------------------------------------------
  describe("API-07: Custom Sorting & Pagination", () => {
    it("sorts tickets by createdAt desc by default", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId });

      expect(res.status).toBe(200);
      expect(res.body.tickets[0].ticketNumber).toBe("TKT-2026-900003"); // 2026-02-03
      expect(res.body.tickets[1].ticketNumber).toBe("TKT-2026-900002"); // 2026-02-02
      expect(res.body.tickets[2].ticketNumber).toBe("TKT-2026-900001"); // 2026-02-01
    });

    it("sorts tickets by createdAt asc when sortOrder=asc", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, sortBy: "createdAt", sortOrder: "asc" });

      expect(res.status).toBe(200);
      expect(res.body.tickets[0].ticketNumber).toBe("TKT-2026-900001");
      expect(res.body.tickets[2].ticketNumber).toBe("TKT-2026-900003");
    });

    it("sorts tickets by ticketNumber asc", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, sortBy: "ticketNumber", sortOrder: "asc" });

      expect(res.status).toBe(200);
      expect(res.body.tickets[0].ticketNumber).toBe("TKT-2026-900001");
      expect(res.body.tickets[1].ticketNumber).toBe("TKT-2026-900002");
      expect(res.body.tickets[2].ticketNumber).toBe("TKT-2026-900003");
    });

    it("correctly paginates results with page and limit", async () => {
      // Page 1 with limit 2
      const resPage1 = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, page: 1, limit: 2, sortBy: "ticketNumber", sortOrder: "asc" });

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.tickets.length).toBe(2);
      expect(resPage1.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(resPage1.body.tickets[0].ticketNumber).toBe("TKT-2026-900001");
      expect(resPage1.body.tickets[1].ticketNumber).toBe("TKT-2026-900002");

      // Page 2 with limit 2
      const resPage2 = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, page: 2, limit: 2, sortBy: "ticketNumber", sortOrder: "asc" });

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.tickets.length).toBe(1);
      expect(resPage2.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(resPage2.body.tickets[0].ticketNumber).toBe("TKT-2026-900003");
    });

    it("handles out-of-range page gracefully by returning empty tickets array with valid total", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: userAId, page: 99, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.page).toBe(99);
      expect(res.body.pagination.totalPages).toBe(1);
    });
  });
});
