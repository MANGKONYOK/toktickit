import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { signBearerToken } from "../../src/middleware/auth.js";

describe("Staff & Admin Dashboard API (API-07, API-08, AUTH-04 / FR-12, FR-14 / AC-14, AC-21)", () => {
  const prisma = getPrisma();

  let staffAId: number;
  let adminId: number;
  let requesterId: number;

  let staffTokenA: string;
  let adminToken: string;
  let requesterToken: string;

  const createdTicketIds: number[] = [];
  const createdActionIds: number[] = [];

  beforeAll(async () => {
    const itStaffA = await prisma.user.findFirst({
      where: { email: "piti.srisongkram@gmail.com", isActive: true },
    });
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
    });
    const requester = await prisma.user.findFirst({
      where: { email: "sorawit.chaithong@email.com", isActive: true },
    });
    const category = await prisma.category.findFirst({
      where: { name: "Network", isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: "Campus Wi-Fi", isActive: true },
    });

    if (!itStaffA || !adminUser || !requester || !category || !system) {
      throw new Error("Missing seed data for staff-dashboard.api.test.ts");
    }

    staffAId = itStaffA.id;
    adminId = adminUser.id;
    requesterId = requester.id;

    staffTokenA = signBearerToken({ userId: itStaffA.id, role: itStaffA.role });
    adminToken = signBearerToken({ userId: adminUser.id, role: adminUser.role });
    requesterToken = signBearerToken({ userId: requester.id, role: requester.role });

    // Create an unassigned urgent ticket
    const urgentTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F4STF-${Date.now().toString().slice(-6)}1`,
        requesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        currentStatus: "OPEN",
        summary: "Staff Dashboard Urgent Outage",
        description: "Core campus router unseated",
        ticketOwner: "Unassigned",
        ticketOwnerId: null,
      },
    });
    createdTicketIds.push(urgentTicket.id);

    // Create a ticket assigned to staffA
    const assignedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-F4STF-${Date.now().toString().slice(-6)}2`,
        requesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        summary: "Staff Dashboard Assigned Ticket",
        description: "Patching switch firmware",
        ticketOwner: itStaffA.fullName,
        ticketOwnerId: itStaffA.id,
      },
    });
    createdTicketIds.push(assignedTicket.id);

    // Record an action taken by staffA
    const action = await prisma.actionTaken.create({
      data: {
        ticketId: assignedTicket.id,
        performedById: itStaffA.id,
        actionDateTime: new Date(),
        description: "Replaced fiber patch lead",
        result: "Link re-established at 10Gbps",
        followUpRequired: false,
      },
    });
    createdActionIds.push(action.id);
  });

  afterAll(async () => {
    if (createdActionIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { id: { in: createdActionIds } } });
    }
    if (createdTicketIds.length > 0) {
      await prisma.comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  it("API-07 / AC-14: GET /api/dashboard/staff calculates operational, status, and priority metrics", async () => {
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentActions");
    expect(res.body).toHaveProperty("urgentAttentionTickets");

    const { metrics, recentActions, urgentAttentionTickets } = res.body;

    // Metrics counters
    expect(typeof metrics.unassignedTickets).toBe("number");
    expect(typeof metrics.myAssignedTickets).toBe("number");
    expect(typeof metrics.waitingForRequester).toBe("number");
    expect(typeof metrics.urgentTickets).toBe("number");

    expect(metrics.unassignedTickets).toBeGreaterThanOrEqual(1); // our unassigned ticket
    expect(metrics.myAssignedTickets).toBeGreaterThanOrEqual(1); // our assigned ticket
    expect(metrics.urgentTickets).toBeGreaterThanOrEqual(1); // our urgent ticket

    // Status breakdown includes all 8 statuses
    const statuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];
    for (const s of statuses) {
      expect(metrics.ticketsByStatus).toHaveProperty(s);
      expect(typeof metrics.ticketsByStatus[s]).toBe("number");
    }

    // Priority breakdown includes all 4 priorities
    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    for (const p of priorities) {
      expect(metrics.ticketsByPriority).toHaveProperty(p);
      expect(typeof metrics.ticketsByPriority[p]).toBe("number");
    }

    // Recent actions includes our created action
    expect(Array.isArray(recentActions)).toBe(true);
    expect(recentActions.length).toBeGreaterThanOrEqual(1);
    expect(recentActions.some((a: any) => a.id === createdActionIds[0])).toBe(true);
    expect(recentActions[0]).toHaveProperty("ticketNumber");

    // Urgent attention tickets includes non-terminal urgent or unassigned ticket
    expect(Array.isArray(urgentAttentionTickets)).toBe(true);
    expect(urgentAttentionTickets.length).toBeGreaterThanOrEqual(1);
    expect(urgentAttentionTickets[0]).toHaveProperty("ticketNumber");
    expect(urgentAttentionTickets[0]).toHaveProperty("itPriority");
  });

  it("API-08 / AC-21: GET /api/dashboard/admin includes staff operational data plus user statistics", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("staffDashboard");
    expect(res.body).toHaveProperty("userStats");

    const { staffDashboard, userStats } = res.body;

    // Verify staffDashboard payload
    expect(staffDashboard).toHaveProperty("metrics");
    expect(staffDashboard).toHaveProperty("recentActions");
    expect(staffDashboard).toHaveProperty("urgentAttentionTickets");

    // Verify userStats payload
    expect(typeof userStats.totalUsers).toBe("number");
    expect(typeof userStats.activeUsers).toBe("number");
    expect(typeof userStats.inactiveUsers).toBe("number");
    expect(userStats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(userStats.activeUsers).toBeGreaterThanOrEqual(1);

    expect(userStats.byRole).toHaveProperty("REQUESTER");
    expect(userStats.byRole).toHaveProperty("IT_STAFF");
    expect(userStats.byRole).toHaveProperty("ADMIN");
    expect(typeof userStats.byRole.REQUESTER).toBe("number");
    expect(typeof userStats.byRole.IT_STAFF).toBe("number");
    expect(typeof userStats.byRole.ADMIN).toBe("number");
  });

  it("AUTH-04 / AC-14: denies Requester access to staff and admin dashboards with HTTP 403 Forbidden", async () => {
    // Staff dashboard call by requester
    const staffRes = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(staffRes.status).toBe(403);
    expect(staffRes.body.error.code).toBe("FORBIDDEN");

    // Admin dashboard call by requester
    const adminRes = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe("FORBIDDEN");
  });

  it("denies IT Staff access to admin dashboard with HTTP 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${staffTokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

