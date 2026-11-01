import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";

export interface RequesterDashboardResponse {
  metrics: {
    totalOpen: number;
    waitingForRequester: number;
    recentlyUpdated: number;
    recentlyResolved: number;
  };
  recentTickets: Array<{
    id: number;
    ticketNumber: string;
    summary: string;
    categoryName: string;
    requestedPriority: Priority;
    currentStatus: TicketStatus;
    resolvedByRequester: boolean;
    updatedAt: string;
  }>;
}

export interface StaffDashboardResponse {
  metrics: {
    unassignedTickets: number;
    myAssignedTickets: number;
    waitingForRequester: number;
    urgentTickets: number;
    ticketsByStatus: Record<TicketStatus, number>;
    ticketsByPriority: Record<Priority, number>;
  };
  recentActions: Array<{
    id: number;
    ticketId: number;
    ticketNumber: string;
    actionDateTime: string;
    description: string;
    result: string;
    followUpRequired: boolean;
  }>;
  urgentAttentionTickets: Array<{
    id: number;
    ticketNumber: string;
    summary: string;
    itPriority: Priority;
    currentStatus: TicketStatus;
    ticketOwner: string;
    createdAt: string;
  }>;
}

export interface AdminDashboardResponse {
  staffDashboard: StaffDashboardResponse;
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    byRole: Record<Role, number>;
  };
}

/**
 * Computes authoritative dashboard metrics for a Requester (FR-10, BR-15..19, BR-25).
 */
export async function getRequesterDashboardData(
  prisma: PrismaClient,
  requesterId: number
): Promise<RequesterDashboardResponse> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalOpen, waitingForRequester, recentlyUpdated, recentlyResolved, recentTickets] =
    await Promise.all([
      // BR-16: Requester Total Open
      prisma.ticket.count({
        where: {
          requesterId,
          currentStatus: {
            in: [
              TicketStatus.NEW,
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_FOR_REQUESTER,
              TicketStatus.REOPENED,
            ],
          },
        },
      }),

      // BR-17: Waiting for Requester
      prisma.ticket.count({
        where: {
          requesterId,
          currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
        },
      }),

      // BR-18: Recently Updated (past 7 days)
      prisma.ticket.count({
        where: {
          requesterId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),

      // BR-19: Recently Resolved (past 30 days)
      prisma.ticket.count({
        where: {
          requesterId,
          currentStatus: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Recent 5 tickets owned by requester
      prisma.ticket.findMany({
        where: { requesterId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
        include: {
          category: { select: { name: true } },
        },
      }),
    ]);

  return {
    metrics: {
      totalOpen,
      waitingForRequester,
      recentlyUpdated,
      recentlyResolved,
    },
    recentTickets: recentTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      categoryName: t.category.name,
      requestedPriority: t.requestedPriority,
      currentStatus: t.currentStatus,
      resolvedByRequester: t.resolvedByRequester ?? false,
      updatedAt: t.updatedAt.toISOString(),
    })),
  };
}

/**
 * Computes authoritative operational dashboard metrics for IT Staff and Admins (FR-12, BR-15, BR-20..25).
 */
export async function getStaffDashboardData(
  prisma: PrismaClient,
  staffUserId: number
): Promise<StaffDashboardResponse> {
  const nonTerminalStatuses = [
    TicketStatus.NEW,
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.REOPENED,
  ];

  const [
    unassignedTickets,
    myAssignedTickets,
    waitingForRequester,
    urgentTickets,
    statusGroups,
    priorityGroups,
    recentActionsRaw,
    urgentAttentionTicketsRaw,
  ] = await Promise.all([
    // BR-20: Unassigned non-terminal tickets
    prisma.ticket.count({
      where: {
        currentStatus: { in: nonTerminalStatuses },
        ticketOwnerId: null,
      },
    }),

    // BR-21: Assigned to current staff user
    prisma.ticket.count({
      where: {
        currentStatus: { in: nonTerminalStatuses },
        ticketOwnerId: staffUserId,
      },
    }),

    // Waiting for Requester across all tickets
    prisma.ticket.count({
      where: {
        currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
      },
    }),

    // Urgent active tickets
    prisma.ticket.count({
      where: {
        currentStatus: { in: nonTerminalStatuses },
        itPriority: Priority.URGENT,
      },
    }),

    // BR-22: Status Distribution across all 8 statuses
    prisma.ticket.groupBy({
      by: ["currentStatus"],
      _count: { id: true },
    }),

    // BR-23: Priority Distribution across non-terminal tickets
    prisma.ticket.groupBy({
      by: ["itPriority"],
      where: {
        currentStatus: { in: nonTerminalStatuses },
      },
      _count: { id: true },
    }),

    // BR-24: 5 most recent Action Taken records by current staff user
    prisma.actionTaken.findMany({
      where: { performedById: staffUserId },
      orderBy: [{ actionDateTime: "desc" }, { id: "desc" }],
      take: 5,
      include: {
        ticket: { select: { ticketNumber: true } },
      },
    }),

    // Top 5 urgent or unassigned tickets requiring immediate triage
    prisma.ticket.findMany({
      where: {
        currentStatus: { in: nonTerminalStatuses },
        OR: [{ itPriority: Priority.URGENT }, { ticketOwnerId: null }],
      },
      orderBy: [
        { itPriority: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
    }),
  ]);

  // Normalize all 8 statuses in dictionary (BR-25 default to 0)
  const ticketsByStatus: Record<TicketStatus, number> = {
    [TicketStatus.NEW]: 0,
    [TicketStatus.OPEN]: 0,
    [TicketStatus.IN_PROGRESS]: 0,
    [TicketStatus.WAITING_FOR_REQUESTER]: 0,
    [TicketStatus.RESOLVED]: 0,
    [TicketStatus.CLOSED]: 0,
    [TicketStatus.REOPENED]: 0,
    [TicketStatus.CANCELLED]: 0,
  };
  for (const group of statusGroups) {
    ticketsByStatus[group.currentStatus] = group._count.id;
  }

  // Normalize all 4 priorities in dictionary (BR-25 default to 0)
  const ticketsByPriority: Record<Priority, number> = {
    [Priority.LOW]: 0,
    [Priority.MEDIUM]: 0,
    [Priority.HIGH]: 0,
    [Priority.URGENT]: 0,
  };
  for (const group of priorityGroups) {
    ticketsByPriority[group.itPriority] = group._count.id;
  }

  return {
    metrics: {
      unassignedTickets,
      myAssignedTickets,
      waitingForRequester,
      urgentTickets,
      ticketsByStatus,
      ticketsByPriority,
    },
    recentActions: recentActionsRaw.map((a) => ({
      id: a.id,
      ticketId: a.ticketId,
      ticketNumber: a.ticket.ticketNumber,
      actionDateTime: a.actionDateTime.toISOString(),
      description: a.description,
      result: a.result,
      followUpRequired: a.followUpRequired,
    })),
    urgentAttentionTickets: urgentAttentionTicketsRaw.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      ticketOwner: t.ticketOwner,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

/**
 * Computes user account health metrics for Administrator dashboard (FR-14, AC-21).
 */
export async function getAdminUserStats(prisma: PrismaClient) {
  const [totalUsers, activeUsers, inactiveUsers, roleGroups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),
  ]);

  const byRole: Record<Role, number> = {
    [Role.REQUESTER]: 0,
    [Role.IT_STAFF]: 0,
    [Role.ADMIN]: 0,
  };
  for (const group of roleGroups) {
    byRole[group.role] = group._count.id;
  }

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    byRole,
  };
}

