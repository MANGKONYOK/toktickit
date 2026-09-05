import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput, PriorityType } from "./utils/ticket-validation.js";
import { parseTicketQueryParams } from "./utils/ticket-query.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 1 — GET /api/categories
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch categories",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 2 — GET /api/related-systems
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    console.error("GET /api/related-systems failed:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch related systems",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 3 — GET /api/requesters
// Retrieve active Development Requesters for the simulated selector (BR-04)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        isActive: true,
      },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error("GET /api/requesters failed:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch development requesters",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 5 — GET /api/tickets
// Retrieve selected requester's tickets with search, multi-filter, sorting & pagination
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  const correlationId = `req-${Date.now()}`;
  try {
    const parseResult = parseTicketQueryParams(req.query, req.headers);
    if (!parseResult.isValid || !parseResult.params) {
      console.warn(`[${correlationId}] GET /api/tickets validation failed:`, parseResult.errors);
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          fieldErrors: parseResult.errors,
          correlationId,
        },
      });
      return;
    }

    const {
      requesterId,
      search,
      categoryId,
      requestedPriority,
      itPriority,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    } = parseResult.params;

    const prisma = getPrisma();

    // Verify requester exists and is active (ownership context)
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });

    if (!requester) {
      console.warn(`[${correlationId}] Active requester not found: id=${requesterId}`);
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Active requester not found",
          correlationId,
        },
      });
      return;
    }

    // Build filter criteria with strict ownership isolation (FR-06 / AC-03)
    const where: any = {
      requesterId: requester.id,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (requestedPriority) {
      where.requestedPriority = requestedPriority;
    }

    if (itPriority) {
      where.itPriority = itPriority;
    }

    if (status) {
      where.currentStatus = status;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
          requester: {
            select: { id: true, fullName: true, email: true, department: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to fetch tickets:`, error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve tickets",
        correlationId,
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 4 — POST /api/tickets
// Create support ticket with sequential ticketNumber and initial lifecycle state
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  const correlationId = `req-${Date.now()}`;
  try {
    // Support requester identity duality (req.body.requesterId || x-requester-id header)
    const headerRequesterId = req.headers["x-requester-id"]
      ? Number(req.headers["x-requester-id"])
      : undefined;

    const payload =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? {
            ...req.body,
            requesterId: req.body.requesterId ?? headerRequesterId,
          }
        : req.body;

    const validation = validateTicketInput(payload);
    if (!validation.isValid) {
      console.warn(`[${correlationId}] POST /api/tickets validation failed:`, validation.errors);
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters or payload",
          fieldErrors: validation.errors,
          correlationId,
        },
      });
      return;
    }

    const {
      requesterId,
      categoryId,
      relatedSystemId,
      requestedPriority = "MEDIUM",
      summary,
      description,
    } = payload;

    const prisma = getPrisma();

    // Verify foreign key integrity & active status
    const [requester, category, system] = await Promise.all([
      prisma.requesterUser.findFirst({
        where: { id: Number(requesterId), isActive: true },
      }),
      prisma.category.findFirst({
        where: { id: Number(categoryId), isActive: true },
      }),
      prisma.relatedSystem.findFirst({
        where: { id: Number(relatedSystemId), isActive: true },
      }),
    ]);

    if (!requester || !category || !system) {
      console.warn(
        `[${correlationId}] Reference check failed: requester=${Boolean(requester)}, category=${Boolean(category)}, system=${Boolean(system)}`
      );
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Specified requester, category, or related system does not exist or is inactive",
          correlationId,
        },
      });
      return;
    }

    // Atomic transaction for ticketNumber generation and ticket creation
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);
      const priorityEnum = (requestedPriority as PriorityType) || "MEDIUM";

      return tx.ticket.create({
        data: {
          ticketNumber,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: priorityEnum,
          itPriority: priorityEnum, // BR-02: Initial itPriority matches requestedPriority
          currentStatus: "NEW", // BR-02: Initial status is NEW
          summary: summary.trim(),
          description: description.trim(),
          ticketOwner: "Unassigned", // BR-02: Initial owner is Unassigned
        },
      });
    });

    res.status(201).json(newTicket);
  } catch (error) {
    console.error(`[${correlationId}] Failed to create ticket:`, error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket due to internal server error",
        correlationId,
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Global Error Handling Middleware (Express error middleware for malformed JSON & unhandled exceptions)
// ---------------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const correlationId = `req-${Date.now()}`;
  if (err instanceof SyntaxError && "body" in err) {
    console.warn(`[${correlationId}] Malformed JSON payload received:`, err.message);
    res.status(400).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Request payload must be valid JSON",
        correlationId,
      },
    });
    return;
  }

  console.error(`[${correlationId}] Unhandled server exception:`, err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred",
      correlationId,
    },
  });
});

export default app;