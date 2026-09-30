import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";
import { Role, Priority, TicketStatus } from "@prisma/client";

describe("Staff Ticket Queue APIs (API-15, API-16, API-17 / AC-12, AC-13, AC-14)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let adminUser: any;
  let requesterUserA: any;
  let requesterUserB: any;
  let mustChangeUser: any;

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let mustChangeToken: string;

  let categoryNetwork: any;
  let categoryHardware: any;
  let systemVPN: any;

  let ticket1Unassigned: any;
  let ticket2AssignedStaff: any;
  let ticket3AssignedOther: any;

  beforeAll(async () => {
    // 1. Resolve test users
    staffUser = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@email.com", isActive: true },
    });
    adminUser = await prisma.user.findFirst({
      where: { email: "admin.toktickit@email.com", isActive: true },
    });
    requesterUserA = await prisma.user.findFirst({
      where: { email: "alice.johnson@email.com", isActive: true },
    });
    requesterUserB = await prisma.user.findFirst({
      where: { email: "alice.johnson@email.com", isActive: true },
    });
    mustChangeUser = await prisma.user.findFirst({
      where: { email: "bob.smith@email.com", isActive: true },
    });

    if (!staffUser || !adminUser || !requesterUserA || !requesterUserB || !mustChangeUser) {
      throw new Error("Missing required seed users for staff queue tests");
    }

    staffToken = signBearerToken({ userId: staffUser.id, role: staffUser.role });
    adminToken = signBearerToken({ userId: adminUser.id, role: adminUser.role });
    requesterToken = signBearerToken({ userId: requesterUserA.id, role: requesterUserA.role });
    mustChangeToken = signBearerToken({ userId: mustChangeUser.id, role: mustChangeUser.role });

    // Clean up any stale test tickets before creation
    await prisma.ticket.deleteMany({
      where: { ticketNumber: { startsWith: "TKT-TEST-" } },
    });

    // 2. Resolve categories and systems
    categoryNetwork = await prisma.category.findFirst({ where: { name: "Network" } });
    categoryHardware = await prisma.category.findFirst({ where: { name: "Hardware" } });
    systemVPN = await prisma.relatedSystem.findFirst({ where: { name: "VPN" } });

    if (!categoryNetwork || !categoryHardware || !systemVPN) {
      throw new Error("Missing required reference data for staff queue tests");
    }

    // 3. Ensure test tickets exist with distinct attributes for filtering/search
    const uniqueSuffix = Date.now().toString().slice(-6);

    ticket1Unassigned = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-A${uniqueSuffix}`,
        summary: `VPN connection intermittent failure ${uniqueSuffix}`,
        description: "VPN drops frequently during business hours",
        categoryId: categoryNetwork.id,
        relatedSystemId: systemVPN.id,
        requestedPriority: Priority.HIGH,
        itPriority: Priority.URGENT,
        currentStatus: TicketStatus.OPEN,
        requesterId: requesterUserA.id,
        ticketOwnerId: null,
        ticketOwner: "Unassigned",
      },
    });

    ticket2AssignedStaff = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-B${uniqueSuffix}`,
        summary: `Hardware display glitch monitor ${uniqueSuffix}`,
        description: "External monitor flickers intermittently",
        categoryId: categoryHardware.id,
        relatedSystemId: systemVPN.id,
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.HIGH,
        currentStatus: TicketStatus.IN_PROGRESS,
        requesterId: requesterUserB.id,
        ticketOwnerId: staffUser.id,
        ticketOwner: staffUser.fullName,
      },
    });

    ticket3AssignedOther = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-C${uniqueSuffix}`,
        summary: `VPN license configuration setup ${uniqueSuffix}`,
        description: "Requester needs client configuration profile",
        categoryId: categoryNetwork.id,
        relatedSystemId: systemVPN.id,
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        currentStatus: TicketStatus.NEW,
        requesterId: requesterUserB.id,
        ticketOwnerId: adminUser.id,
        ticketOwner: adminUser.fullName,
      },
    });
  });

  afterAll(async () => {
    const ids = [ticket1Unassigned?.id, ticket2AssignedStaff?.id, ticket3AssignedOther?.id].filter(Boolean);
    if (ids.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  // -------------------------------------------------------------------------
  // RBAC & Route Protection Tests
  // -------------------------------------------------------------------------
  describe("Staff Queue RBAC Authorization", () => {
    it("rejects unauthenticated requests with HTTP 401 Unauthorized", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects REQUESTER role with HTTP 403 Forbidden (AC-07 / BR-10)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("intercepts users with mustChangePassword: true with 403 (AC-04 / BR-03)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${mustChangeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("allows ADMIN role to access the staff queue with HTTP 200", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-15: Search Substring Across All Users
  // -------------------------------------------------------------------------
  describe("API-15 (AC-12): IT Staff queries ticket queue with search substring", () => {
    it("returns matching tickets across all users when searching by summary substring", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?search=display%20glitch`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);

      const found = res.body.tickets.find((t: any) => t.id === ticket2AssignedStaff.id);
      expect(found).toBeDefined();
      expect(found.summary).toContain("display glitch");
      expect(found.requesterName).toBe(requesterUserB.fullName);
    });

    it("returns matching tickets when searching by exact or partial ticketNumber", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?search=${ticket1Unassigned.ticketNumber}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].ticketNumber).toBe(ticket1Unassigned.ticketNumber);
      expect(res.body.tickets[0].categoryName).toBe("Network");
      expect(res.body.tickets[0].itPriority).toBe("URGENT");
    });

    it("returns empty ticket list when search matches nothing", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=NON_EXISTENT_SUBSTRING_XYZ_99999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
      expect(res.body.pagination.totalRecords).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // API-16: Multi-Criteria Filtering
  // -------------------------------------------------------------------------
  describe("API-16 (AC-13): IT Staff queries queue with multi-criteria filters", () => {
    it("filters tickets strictly by category and priority intersection", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?categoryId=${categoryNetwork.id}&priority=URGENT`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);

      for (const t of res.body.tickets) {
        expect(t.categoryName).toBe("Network");
        expect(t.itPriority).toBe("URGENT");
      }

      const match = res.body.tickets.find((t: any) => t.id === ticket1Unassigned.id);
      expect(match).toBeDefined();
    });

    it("filters tickets by status (e.g. IN_PROGRESS)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?status=IN_PROGRESS`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.tickets) {
        expect(t.status).toBe("IN_PROGRESS");
      }

      const match = res.body.tickets.find((t: any) => t.id === ticket2AssignedStaff.id);
      expect(match).toBeDefined();
    });

    it("rejects invalid priority with HTTP 400 Bad Request", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?priority=SUPER_CRITICAL`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors.priority).toBeDefined();
    });

    it("rejects invalid status with HTTP 400 Bad Request", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?status=INVALID_STATUS`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors.status).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-17: Ownership Assignment Filtering
  // -------------------------------------------------------------------------
  describe("API-17 (AC-14): IT Staff filters queue by assignment (unassigned and me)", () => {
    it("returns only unassigned tickets when assigned=unassigned", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?assigned=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);

      for (const t of res.body.tickets) {
        expect(t.assignedOwnerId).toBeNull();
      }

      const unassignedMatch = res.body.tickets.find((t: any) => t.id === ticket1Unassigned.id);
      expect(unassignedMatch).toBeDefined();

      const assignedMatch = res.body.tickets.find((t: any) => t.id === ticket2AssignedStaff.id);
      expect(assignedMatch).toBeUndefined();
    });

    it("returns only tickets assigned to the logged-in staff user when assigned=me", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?assigned=me")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);

      for (const t of res.body.tickets) {
        expect(t.assignedOwnerId).toBe(staffUser.id);
      }

      const myTicketMatch = res.body.tickets.find((t: any) => t.id === ticket2AssignedStaff.id);
      expect(myTicketMatch).toBeDefined();

      const otherStaffTicket = res.body.tickets.find((t: any) => t.id === ticket3AssignedOther.id);
      expect(otherStaffTicket).toBeUndefined();
    });

    it("returns both assigned and unassigned tickets when assigned=all", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?assigned=all")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.some((t: any) => t.id === ticket1Unassigned.id)).toBe(true);
      expect(res.body.tickets.some((t: any) => t.id === ticket2AssignedStaff.id)).toBe(true);
      expect(res.body.tickets.some((t: any) => t.id === ticket3AssignedOther.id)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Sorting & Pagination Tests
  // -------------------------------------------------------------------------
  describe("Deterministic Sorting & Pagination (BR-11, BR-25)", () => {
    it("supports sorting by createdAt asc and desc", async () => {
      const resDesc = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=desc&pageSize=5")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(resDesc.status).toBe(200);
      const descTickets = resDesc.body.tickets;
      if (descTickets.length >= 2) {
        const time0 = new Date(descTickets[0].createdAt).getTime();
        const time1 = new Date(descTickets[1].createdAt).getTime();
        expect(time0).toBeGreaterThanOrEqual(time1);
      }

      const resAsc = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=asc&pageSize=5")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(resAsc.status).toBe(200);
      const ascTickets = resAsc.body.tickets;
      if (ascTickets.length >= 2) {
        const time0 = new Date(ascTickets[0].createdAt).getTime();
        const time1 = new Date(ascTickets[1].createdAt).getTime();
        expect(time0).toBeLessThanOrEqual(time1);
      }
    });

    it("paginates results accurately with page and pageSize", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=1&pageSize=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(2);
      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBe(Math.ceil(res.body.pagination.totalRecords / 2));
    });
  });
});
