import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput, PriorityType } from "./utils/ticket-validation.js";

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
// Lab 2 Endpoint 4 — POST /api/tickets
// Create support ticket with sequential ticketNumber and initial lifecycle state
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const validation = validateTicketInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters or payload",
          fieldErrors: validation.errors,
          correlationId: `req-${Date.now()}`,
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
    } = req.body;

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
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Specified requester, category, or related system does not exist or is inactive",
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
    console.error("Failed to create ticket:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket due to internal server error",
        correlationId: `req-${Date.now()}`,
      },
    });
  }
});

export default app;