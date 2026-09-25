import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import multer from "multer";
import fs from "fs";
import { Role, Priority, TicketStatus } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput, PriorityType } from "./utils/ticket-validation.js";
import { parseTicketQueryParams } from "./utils/ticket-query.js";
import { parseStaffTicketQueryParams } from "./utils/staff-ticket-query.js";
import {
  isValidStatusTransition,
  isValidTicketStatus,
} from "./utils/status-transition.js";
import { uploadMiddleware } from "./utils/upload.js";
import {
  requireAuth,
  requirePasswordChangeClear,
  requireRole,
  authenticateSession,
  SESSION_COOKIE_NAME,
  SESSION_SECRET,
} from "./middleware/auth.js";
import { validatePasswordComplexity } from "./utils/password-validator.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser(SESSION_SECRET));
app.use(express.json());

// Helper to resolve active requester identity against the User model (Ticket.requesterId foreign key target).
async function findActiveRequester(prisma: ReturnType<typeof getPrisma>, requesterId: number) {
  return await prisma.user.findFirst({
    where: { id: requesterId, isActive: true },
  });
}

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
// Protected by requireAuth to prevent unauthenticated directory enumeration
// ---------------------------------------------------------------------------
app.get("/api/requesters", requireAuth, requirePasswordChangeClear, async (_req: Request, res: Response) => {
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
app.get("/api/tickets", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const isRequester = req.user!.role === Role.REQUESTER;
    const effectiveRequesterId = isRequester
      ? req.user!.id
      : (req.query.requesterId ? Number(req.query.requesterId) : undefined);

    const parseResult = parseTicketQueryParams(req.query, effectiveRequesterId);
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

    // Build filter criteria: Requesters strictly scoped to their own session user ID (AC-09, FR-05)
    const where: any = {};
    if (isRequester) {
      where.requesterId = req.user!.id;
    } else if (parseResult.params.requesterId) {
      where.requesterId = parseResult.params.requesterId;
    }

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
        // Deterministic ordering: secondary sort key on id: "desc" prevents page drift
        orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
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
            // Expose only necessary fields in list view, omitting email and department
            select: { id: true, fullName: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const mappedTickets = tickets.map((t) => ({
      ...t,
      status: t.currentStatus,
      priority: t.requestedPriority,
      resolvedByRequester: t.resolvedByRequester ?? false,
    }));

    res.status(200).json({
      tickets: mappedTickets,
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
app.post("/api/tickets", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    // Session identity strictly determines ticket requester (AC-08, BR-06, FR-05)
    // Any client-provided identity header (x-requester-id) or body requesterId is ignored
    const effectiveRequesterId = req.user!.id;

    const payload =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? {
            ...req.body,
            requesterId: effectiveRequesterId,
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
      findActiveRequester(prisma, Number(requesterId)),
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
          itPriority: priorityEnum, // BR-13: Initial itPriority matches requestedPriority
          currentStatus: "NEW", // BR-02: Initial status is NEW
          summary: summary.trim(),
          description: description.trim(),
          ticketOwner: "Unassigned", // BR-02: Initial owner is Unassigned
          resolvedByRequester: false,
        },
      });
    });

    res.status(201).json({
      ...newTicket,
      status: newTicket.currentStatus,
      priority: newTicket.requestedPriority,
      resolvedByRequester: newTicket.resolvedByRequester,
    });
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
// Lab 2 Endpoint 6 — GET /api/tickets/:id
// Retrieve complete details and attachments for a single ticket, strictly enforcing ownership (BR-08 / AC-13)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId },
      });
      return;
    }

    const prisma = getPrisma();
    let ticket;

    if (req.user!.role === Role.REQUESTER) {
      // Ownership applied directly as a SQL where predicate (AC-09: 404 for unowned tickets)
      ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: req.user!.id },
        include: {
          requester: {
            select: { id: true, fullName: true, email: true, department: true },
          },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: { orderBy: { uploadedAt: "asc" } },
        },
      });
    } else {
      // Staff and Admin can view any ticket
      ticket = await prisma.ticket.findFirst({
        where: { id: ticketId },
        include: {
          requester: {
            select: { id: true, fullName: true, email: true, department: true },
          },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: { orderBy: { uploadedAt: "asc" } },
        },
      });
    }

    if (!ticket) {
      res.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
      });
      return;
    }

    const activeAttachments = ticket.attachments
      .filter((a) => !a.removedAt)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        uploadedAt: a.uploadedAt,
        isRemoved: false,
      }));

    const removedAttachments = ticket.attachments
      .filter((a) => !!a.removedAt)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        removedAt: a.removedAt,
        removedById: a.removedById,
        removalReason: a.removalReason,
        isRemoved: true,
      }));

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      priority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
      status: ticket.currentStatus,
      ticketOwner: ticket.ticketOwner,
      ticketOwnerId: ticket.ticketOwnerId,
      resolvedByRequester: ticket.resolvedByRequester ?? false,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      attachments: activeAttachments,
      removedAttachments,
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to fetch ticket detail:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch ticket detail", correlationId },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 7 — POST /api/tickets/:id/attachments
// Upload an attachment to an existing ticket (AC-14..16, BR-09..10)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
  requireAuth,
  requirePasswordChangeClear,
  uploadMiddleware.single("file"),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId) || ticketId <= 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId } });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Attachment file is required", correlationId } });
        return;
      }

      const prisma = getPrisma();

      // For Requesters, enforce ownership directly via SQL predicate (BR-08)
      const ticketWhere: any = { id: ticketId };
      if (req.user!.role === Role.REQUESTER) {
        ticketWhere.requesterId = req.user!.id;
      }

      const ticket = await prisma.ticket.findFirst({
        where: ticketWhere,
        include: {
          attachments: {
            where: { removedAt: null },
          },
        },
      });

      if (!ticket) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId } });
        return;
      }

      // Enforce 5 active attachments cap (BR-10 / AC-16)
      if (ticket.attachments.length >= 5) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(409).json({
          error: {
            code: "ATTACHMENT_LIMIT_EXCEEDED",
            message: "Maximum 5 active attachments allowed per ticket",
            correlationId,
          },
        });
        return;
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          fileName: req.file.originalname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          filePath: req.file.path,
          uploadedById: req.user!.id,
        },
      });

      res.status(201).json({
        id: attachment.id,
        ticketId: attachment.ticketId,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedAt: attachment.uploadedAt,
      });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error(`[${correlationId}] Failed to upload attachment:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to upload attachment", correlationId },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 8 — GET /api/tickets/:id/attachments
// Retrieve attachment metadata list (active and soft-removed) for a ticket
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id/attachments", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }

    const prisma = getPrisma();

    // Strict ownership applied directly as a SQL where predicate (BR-08 / AC-09)
    const ticketWhere: any = { id: ticketId };
    if (req.user!.role === Role.REQUESTER) {
      ticketWhere.requesterId = req.user!.id;
    }

    const ticket = await prisma.ticket.findFirst({
      where: ticketWhere,
      include: {
        attachments: { orderBy: { uploadedAt: "asc" } },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId } });
      return;
    }

    const activeAttachments = ticket.attachments
      .filter((a) => !a.removedAt)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        uploadedAt: a.uploadedAt,
      }));

    const removedAttachments = ticket.attachments
      .filter((a) => !!a.removedAt)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        removedAt: a.removedAt,
        removalReason: a.removalReason,
      }));

    res.status(200).json({ activeAttachments, removedAttachments });
  } catch (error) {
    console.error(`[${correlationId}] Failed to fetch ticket attachments:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch attachments", correlationId },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 9 — GET /api/attachments/:id/download
// Download active attachment stream. Rejects soft-removed files with 410 Gone (AC-18, BR-12)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }

    const prisma = getPrisma();

    const attachmentWhere: any = { id: attachmentId };
    if (req.user!.role === Role.REQUESTER) {
      attachmentWhere.ticket = { requesterId: req.user!.id };
    }

    const attachment = await prisma.attachment.findFirst({
      where: attachmentWhere,
      include: { ticket: true },
    });

    if (!attachment) {
      res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found", correlationId } });
      return;
    }

    // BR-12 / AC-18: Download Blocking for Removed Attachments
    if (attachment.removedAt !== null) {
      res.status(410).json({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and cannot be downloaded",
          correlationId,
        },
      });
      return;
    }

    if (!fs.existsSync(attachment.filePath)) {
      res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "Attachment file missing from storage", correlationId } });
      return;
    }

    res.download(attachment.filePath, attachment.originalName || attachment.fileName);
  } catch (error) {
    console.error(`[${correlationId}] Failed to download attachment:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to download attachment", correlationId },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Endpoint 10 — DELETE /api/attachments/:id
// Soft-remove an active attachment with mandatory reason (AC-17, BR-11)
// ---------------------------------------------------------------------------
app.delete("/api/attachments/:id", requireAuth, requirePasswordChangeClear, async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const attachmentId = parseInt(req.params.id, 10);
    const reason = req.body?.reason;

    if (isNaN(attachmentId) || attachmentId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }

    // Validate removal reason: required string, 5 to 255 chars
    if (!reason || typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 255) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Removal reason must be between 5 and 255 characters",
          fieldErrors: { reason: "Removal reason must be between 5 and 255 characters" },
          correlationId,
        },
      });
      return;
    }

    const prisma = getPrisma();

    const attachmentWhere: any = { id: attachmentId };
    if (req.user!.role === Role.REQUESTER) {
      attachmentWhere.ticket = { requesterId: req.user!.id };
    }

    const attachment = await prisma.attachment.findFirst({
      where: attachmentWhere,
    });

    if (!attachment) {
      res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found", correlationId } });
      return;
    }

    if (attachment.removedAt !== null) {
      res.status(409).json({
        error: {
          code: "ALREADY_REMOVED",
          message: "Attachment has already been removed",
          correlationId,
        },
      });
      return;
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        removedAt: new Date(),
        removedById: req.user!.id,
        removalReason: reason.trim(),
      },
    });

    res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      fileName: updated.fileName,
      originalName: updated.originalName,
      removedAt: updated.removedAt,
      removedById: updated.removedById,
      removalReason: updated.removalReason,
      isRemoved: true,
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to soft-remove attachment:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to soft-remove attachment", correlationId },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — POST /api/tickets/:id/comments
// Add a public comment to a ticket (AC-10 / FR-06)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChangeClear,
  async (req: Request, res: Response) => {
    const correlationId = randomUUID();
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId) || ticketId <= 0) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId },
        });
        return;
      }

      const { content } = req.body || {};
      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0 ||
        content.trim().length > 2000
      ) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Comment content must be between 1 and 2000 characters",
            fieldErrors: { content: "Comment content must be between 1 and 2000 characters" },
            correlationId,
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      // Requester may only comment on tickets they own (AC-09 / AC-10)
      if (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      const comment = await prisma.comment.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      res.status(201).json({
        comment: {
          id: comment.id,
          ticketId: comment.ticketId,
          authorId: comment.authorId,
          authorName: comment.author.fullName,
          authorRole: comment.author.role,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
        },
      });
    } catch (err) {
      console.error(`[${correlationId}] POST /api/tickets/:id/comments failed:`, err);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to post comment", correlationId },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — GET /api/tickets/:id/comments
// List public comments for a ticket in chronological order (AC-10)
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChangeClear,
  async (req: Request, res: Response) => {
    const correlationId = randomUUID();
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId) || ticketId <= 0) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      if (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      const comments = await prisma.comment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      res.status(200).json({
        comments: comments.map((c) => ({
          id: c.id,
          ticketId: c.ticketId,
          authorId: c.authorId,
          authorName: c.author.fullName,
          authorRole: c.author.role,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      console.error(`[${correlationId}] GET /api/tickets/:id/comments failed:`, err);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to retrieve comments", correlationId },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — PATCH /api/tickets/:id/resolve-indication
// Requester indicates problem appears resolved (AC-11 / BR-05)
// ---------------------------------------------------------------------------
app.patch(
  "/api/tickets/:id/resolve-indication",
  requireAuth,
  requirePasswordChangeClear,
  async (req: Request, res: Response) => {
    const correlationId = randomUUID();
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId) || ticketId <= 0) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId },
        });
        return;
      }

      // Role check: Only Requesters can indicate problem resolution per specification.md:133 (Denied 403 for Staff/Admin)
      if (req.user!.role !== Role.REQUESTER) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only requesters can indicate problem resolution on tickets.",
            correlationId,
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      // Only the ticket requester can indicate resolution on their own ticket (AC-11)
      if (ticket.requesterId !== req.user!.id) {
        res.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found", correlationId },
        });
        return;
      }

      // Check terminal states
      if (ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED") {
        res.status(400).json({
          error: {
            code: "INVALID_ACTION",
            message: "Cannot indicate problem resolution on a closed or cancelled ticket.",
            correlationId,
          },
        });
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          resolvedByRequester: true,
        },
      });

      // If optional comment was provided, record it in Comment table
      const commentContent = req.body?.comment;
      if (typeof commentContent === "string" && commentContent.trim().length > 0) {
        await prisma.comment.create({
          data: {
            ticketId,
            authorId: req.user!.id,
            content: commentContent.trim(),
          },
        });
      }

      res.status(200).json({
        ticket: {
          id: updated.id,
          status: updated.currentStatus,
          resolvedByRequester: updated.resolvedByRequester,
        },
        message: "Problem resolution indicated successfully.",
      });
    } catch (err) {
      console.error(`[${correlationId}] PATCH /api/tickets/:id/resolve-indication failed:`, err);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to indicate problem resolution", correlationId },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — POST /api/auth/login
// ---------------------------------------------------------------------------
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const correlationId = randomUUID();
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required.",
          fieldErrors: {
            ...(!email ? { email: "Email is required." } : {}),
            ...(!password ? { password: "Password is required." } : {}),
          },
          correlationId,
        },
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Dummy compare to avoid timing leak
      await bcrypt.compare(password, "$2b$10$ep5w1/bB3Xq1b/0hQZk.teH.w2KjG6i.fKq1G3aP7U7xXjT8a6bCy");
      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          correlationId,
        },
      });
      return;
    }

    // Password must be verified BEFORE checking isActive (BR-04 / AC-03 anti-enumeration)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          correlationId,
        },
      });
      return;
    }

    // Only if password is correct, check active status
    if (!user.isActive) {
      res.status(403).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Account is inactive. Please contact the system administrator.",
          correlationId,
        },
      });
      return;
    }

    // Set signed HTTP-only cookie
    const sessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    res.cookie(SESSION_COOKIE_NAME, JSON.stringify(sessionPayload), {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.status(200).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        department: user.department,
      },
      message: "Login successful.",
    });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during login.",
        correlationId,
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — POST /api/auth/logout
// ---------------------------------------------------------------------------
app.post("/api/auth/logout", requireAuth, (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(200).json({
    message: "Logout successful.",
  });
});

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — GET /api/auth/me
// ---------------------------------------------------------------------------
app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: {
      id: req.user!.id,
      fullName: req.user!.fullName,
      email: req.user!.email,
      role: req.user!.role,
      mustChangePassword: req.user!.mustChangePassword,
      department: req.user!.department,
    },
  });
});

// ---------------------------------------------------------------------------
// Lab 3 Endpoint — POST /api/auth/change-password
// ---------------------------------------------------------------------------
app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  const correlationId = randomUUID();
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Current password, new password, and confirmation are required.",
          correlationId,
        },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        error: {
          code: "PASSWORD_MISMATCH",
          message: "New password and confirmation do not match.",
          correlationId,
        },
      });
      return;
    }

    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.isValid) {
      res.status(400).json({
        error: {
          code: "PASSWORD_COMPLEXITY_FAILED",
          message: complexity.errors.join(" "),
          correlationId,
        },
      });
      return;
    }

    const user = await getPrisma().user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User not found.",
          correlationId,
        },
      });
      return;
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(401).json({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect.",
          correlationId,
        },
      });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await getPrisma().user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("POST /api/auth/change-password failed:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to change password.",
        correlationId,
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 RBAC Endpoints for Staff & Admin Queue
// ---------------------------------------------------------------------------
app.get(
  "/api/staff/tickets",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    try {
      const parseResult = parseStaffTicketQueryParams(req.query);
      if (!parseResult.isValid || !parseResult.params) {
        console.warn(`[${correlationId}] GET /api/staff/tickets validation failed:`, parseResult.errors);
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
        search,
        categoryId,
        categoryName,
        itPriority,
        status,
        assigned,
        sortBy,
        sortOrder,
        page,
        limit,
      } = parseResult.params;

      const prisma = getPrisma();
      const where: any = {};

      if (search) {
        where.OR = [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      } else if (categoryName) {
        where.category = { name: { contains: categoryName, mode: "insensitive" } };
      }

      if (itPriority) {
        where.itPriority = itPriority;
      }

      if (status) {
        where.currentStatus = status;
      }

      if (assigned === "unassigned") {
        where.ticketOwnerId = null;
      } else if (assigned === "me") {
        where.ticketOwnerId = req.user!.id;
      }

      // Map sortBy to database column name
      let dbSortField: string = sortBy;
      if (sortBy === "priority") {
        dbSortField = "itPriority";
      } else if (sortBy === "status") {
        dbSortField = "currentStatus";
      }

      const skip = (page - 1) * limit;

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          // Deterministic ordering: secondary sort key on id: "desc" prevents page drift (BR-11)
          orderBy: [{ [dbSortField]: sortOrder }, { id: "desc" }],
          skip,
          take: limit,
          include: {
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requester: { select: { id: true, fullName: true, email: true } },
            assignedStaff: { select: { id: true, fullName: true, email: true } },
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limit));

      const mappedTickets = tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        categoryName: t.category?.name || "Unknown",
        relatedSystemName: t.relatedSystem?.name || "None",
        priority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.currentStatus,
        requesterName: t.requester?.fullName || "Unknown",
        requesterId: t.requesterId,
        assignedOwnerName: t.assignedStaff?.fullName || (t.ticketOwner !== "Unassigned" ? t.ticketOwner : null),
        assignedOwnerId: t.ticketOwnerId,
        ticketOwner: t.assignedStaff?.fullName || t.ticketOwner,
        ticketOwnerId: t.ticketOwnerId,
        resolvedByRequester: t.resolvedByRequester ?? false,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        category: t.category,
        relatedSystem: t.relatedSystem,
        requester: t.requester,
        assignedStaff: t.assignedStaff,
      }));

      res.status(200).json({
        tickets: mappedTickets,
        pagination: {
          page,
          pageSize: limit,
          limit,
          totalRecords: total,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to fetch staff tickets:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve staff tickets",
          correlationId,
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Feature 5 — IT Staff Ticket Detail & Lifecycle Operations
// ---------------------------------------------------------------------------

// GET /api/staff/tickets/:id — Full operational ticket detail view
app.get(
  "/api/staff/tickets/:id",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Ticket ID must be a positive integer",
          correlationId,
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: {
            select: { id: true, fullName: true, email: true, department: true, role: true },
          },
          assignedStaff: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              mimeType: true,
              fileSize: true,
              uploadedById: true,
              uploadedAt: true,
              removedAt: true,
              removalReason: true,
            },
            orderBy: { uploadedAt: "asc" },
          },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              authorId: true,
              author: {
                select: { id: true, fullName: true, role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          internalNotes: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              authorId: true,
              author: {
                select: { id: true, fullName: true, role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: `Ticket with ID ${ticketId} not found`,
            correlationId,
          },
        });
        return;
      }

      res.status(200).json({
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          summary: ticket.summary,
          description: ticket.description,
          requestedPriority: ticket.requestedPriority,
          itPriority: ticket.itPriority,
          priority: ticket.itPriority || ticket.requestedPriority,
          status: ticket.currentStatus,
          currentStatus: ticket.currentStatus,
          resolvedByRequester: ticket.resolvedByRequester,
          requester: ticket.requester,
          category: ticket.category,
          relatedSystem: ticket.relatedSystem,
          assignedStaff: ticket.assignedStaff,
          ticketOwnerId: ticket.ticketOwnerId,
          ticketOwner: ticket.ticketOwner,
          assignedOwnerName: ticket.assignedStaff
            ? ticket.assignedStaff.fullName
            : ticket.ticketOwner === "Unassigned"
            ? null
            : ticket.ticketOwner,
          assignedOwnerId: ticket.ticketOwnerId,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          attachments: ticket.attachments.map((att) => ({
            ...att,
            uploadedAt: att.uploadedAt.toISOString(),
            removedAt: att.removedAt ? att.removedAt.toISOString() : null,
          })),
          comments: ticket.comments.map((c) => ({
            id: c.id,
            ticketId: ticket.id,
            authorId: c.authorId,
            authorName: c.author.fullName,
            authorRole: c.author.role,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
          })),
          internalNotes: ticket.internalNotes.map((n) => ({
            id: n.id,
            ticketId: ticket.id,
            authorId: n.authorId,
            authorName: n.author.fullName,
            authorRole: n.author.role,
            content: n.content,
            createdAt: n.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to fetch staff ticket detail:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve staff ticket detail",
          correlationId,
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/assign — Claim or reassign ticket ownership
app.patch(
  "/api/staff/tickets/:id/assign",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Ticket ID must be a positive integer",
          correlationId,
        },
      });
      return;
    }

    const { ticketOwnerId } = req.body;
    if (ticketOwnerId !== null && typeof ticketOwnerId !== "number") {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ticketOwnerId is required and must be a number or null to unassign",
          correlationId,
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: `Ticket with ID ${ticketId} not found`,
            correlationId,
          },
        });
        return;
      }

      let assignedOwnerName: string | null = null;
      let newOwnerName = "Unassigned";

      if (typeof ticketOwnerId === "number") {
        const targetUser = await prisma.user.findFirst({
          where: {
            id: ticketOwnerId,
            isActive: true,
            role: { in: [Role.IT_STAFF, Role.ADMIN] },
          },
        });

        if (!targetUser) {
          res.status(400).json({
            error: {
              code: "INVALID_ASSIGNEE",
              message: "Target assignee must be an active user with role IT_STAFF or ADMIN",
              correlationId,
            },
          });
          return;
        }

        assignedOwnerName = targetUser.fullName;
        newOwnerName = targetUser.fullName;
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          ticketOwnerId: ticketOwnerId,
          ticketOwner: newOwnerName,
        },
      });

      res.status(200).json({
        ticket: {
          id: updated.id,
          ticketOwnerId: updated.ticketOwnerId,
          assignedOwnerName,
        },
        message: "Ownership updated successfully.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to update ticket ownership:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update ticket ownership",
          correlationId,
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/priority — Update operational IT priority
app.patch(
  "/api/staff/tickets/:id/priority",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Ticket ID must be a positive integer",
          correlationId,
        },
      });
      return;
    }

    const { itPriority } = req.body;
    if (!itPriority || !Object.values(Priority).includes(itPriority)) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "itPriority must be one of: LOW, MEDIUM, HIGH, URGENT",
          correlationId,
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: `Ticket with ID ${ticketId} not found`,
            correlationId,
          },
        });
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          itPriority: itPriority as Priority,
        },
      });

      res.status(200).json({
        ticket: {
          id: updated.id,
          itPriority: updated.itPriority,
        },
        message: "IT Priority updated.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to update IT priority:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update IT priority",
          correlationId,
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/status — Transition ticket status per BR-14
app.patch(
  "/api/staff/tickets/:id/status",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Ticket ID must be a positive integer",
          correlationId,
        },
      });
      return;
    }

    const { status } = req.body;
    if (!status || !isValidTicketStatus(status)) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "status is required and must be a valid TicketStatus value",
          correlationId,
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: `Ticket with ID ${ticketId} not found`,
            correlationId,
          },
        });
        return;
      }

      if (!isValidStatusTransition(existingTicket.currentStatus, status as TicketStatus)) {
        res.status(400).json({
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Cannot transition status from ${existingTicket.currentStatus} to ${status}`,
            correlationId,
          },
        });
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          currentStatus: status as TicketStatus,
        },
      });

      res.status(200).json({
        ticket: {
          id: updated.id,
          status: updated.currentStatus,
          currentStatus: updated.currentStatus,
        },
        message: "Status transitioned successfully.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to transition ticket status:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to transition ticket status",
          correlationId,
        },
      });
    }
  }
);

// POST /api/staff/tickets/:id/notes (and alias /api/tickets/:id/internal-notes) — Add private internal note
const addInternalNoteHandler = async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  const ticketId = parseInt(req.params.id, 10);

  if (isNaN(ticketId) || ticketId <= 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Ticket ID must be a positive integer",
        correlationId,
      },
    });
    return;
  }

  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0 || content.trim().length > 2000) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Internal note content must be between 1 and 2000 characters",
        correlationId,
      },
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found`,
          correlationId,
        },
      });
      return;
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    res.status(201).json({
      note: {
        id: note.id,
        ticketId: note.ticketId,
        authorId: note.authorId,
        authorName: note.author.fullName,
        authorRole: note.author.role,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      },
      message: "Internal note added successfully.",
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to add internal note:`, error);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add internal note",
        correlationId,
      },
    });
  }
};

app.post(
  "/api/staff/tickets/:id/notes",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  addInternalNoteHandler
);

app.post(
  "/api/tickets/:id/internal-notes",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  addInternalNoteHandler
);

// GET /api/staff/tickets/:id/notes (and alias /api/tickets/:id/internal-notes) — List private internal notes
const listInternalNotesHandler = async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  const ticketId = parseInt(req.params.id, 10);

  if (isNaN(ticketId) || ticketId <= 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Ticket ID must be a positive integer",
        correlationId,
      },
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found`,
          correlationId,
        },
      });
      return;
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    res.status(200).json({
      notes: notes.map((n) => ({
        id: n.id,
        ticketId: n.ticketId,
        authorId: n.authorId,
        authorName: n.author.fullName,
        authorRole: n.author.role,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to list internal notes:`, error);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list internal notes",
        correlationId,
      },
    });
  }
};

app.get(
  "/api/staff/tickets/:id/notes",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  listInternalNotesHandler
);

app.get(
  "/api/tickets/:id/internal-notes",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.IT_STAFF, Role.ADMIN),
  listInternalNotesHandler
);

// ---------------------------------------------------------------------------
// Lab 3 Administrator Endpoints
// ---------------------------------------------------------------------------

// GET /api/admin/users - List users with optional substring search and role filter
app.get(
  "/api/admin/users",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const prisma = getPrisma();

    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
      const roleQuery = typeof req.query.role === "string" ? req.query.role.trim() : undefined;

      const where: any = {};

      if (roleQuery && roleQuery !== "ALL") {
        if (!Object.values(Role).includes(roleQuery as Role)) {
          res.status(400).json({
            error: {
              code: "INVALID_ROLE",
              message: `Role must be one of: ${Object.values(Role).join(", ")}`,
              correlationId,
            },
          });
          return;
        }
        where.role = roleQuery as Role;
      }

      if (search && search.length > 0) {
        where.OR = [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          department: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ id: "asc" }],
      });

      res.status(200).json({
        users: users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to list admin users:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list users",
          correlationId,
        },
      });
    }
  }
);

// POST /api/admin/users - Create user with initial password (mustChangePassword = true)
app.post(
  "/api/admin/users",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const prisma = getPrisma();

    try {
      const { fullName, email, role, initialPassword, department, isActive } = req.body || {};

      const fieldErrors: Record<string, string> = {};

      if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
        fieldErrors.fullName = "Full name is required";
      } else if (fullName.trim().length > 100) {
        fieldErrors.fullName = "Full name cannot exceed 100 characters";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
        fieldErrors.email = "A valid email address is required";
      }

      if (!role || !Object.values(Role).includes(role as Role)) {
        fieldErrors.role = `Role must be one of: ${Object.values(Role).join(", ")}`;
      }

      if (!initialPassword || typeof initialPassword !== "string") {
        fieldErrors.initialPassword = "An initial password is required";
      } else {
        const complexity = validatePasswordComplexity(initialPassword);
        if (!complexity.isValid) {
          fieldErrors.initialPassword =
            "Password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a digit, and a special symbol (@$!%*?&#^_-)";
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input payload",
            fieldErrors,
            correlationId,
          },
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });

      if (existingUser) {
        res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email address already exists",
            correlationId,
          },
        });
        return;
      }

      const passwordHash = await bcrypt.hash(initialPassword, 10);
      const user = await prisma.user.create({
        data: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          role: role as Role,
          passwordHash,
          mustChangePassword: true,
          department: department && typeof department === "string" ? department.trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          department: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
        },
        message: "User created successfully.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to create user:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
          correlationId,
        },
      });
    }
  }
);

// PATCH /api/admin/users/:id - Edit user profile, role, and active status with safety guardrails
app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const prisma = getPrisma();

    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId) || targetId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "A valid positive integer user id is required",
            correlationId,
          },
        });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            correlationId,
          },
        });
        return;
      }

      const { fullName, email, role, department, isActive } = req.body || {};

      // Guardrail 1 (BR-18): Self-deactivation prevention
      if (isActive === false && targetUser.id === req.user!.id) {
        res.status(400).json({
          error: {
            code: "CANNOT_DEACTIVATE_SELF",
            message: "Administrators cannot deactivate their own account",
            correlationId,
          },
        });
        return;
      }

      // Guardrail 2 (BR-19): Protection of last active administrator
      const isTargetActiveAdmin = targetUser.role === Role.ADMIN && targetUser.isActive === true;
      const isDeactivating = isActive === false;
      const isDemotingRole = role !== undefined && role !== Role.ADMIN;

      if (isTargetActiveAdmin && (isDeactivating || isDemotingRole)) {
        const activeAdminCount = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });

        if (activeAdminCount <= 1) {
          res.status(400).json({
            error: {
              code: "LAST_ADMIN_PROTECTED",
              message: "Cannot deactivate or demote the last active administrator",
              correlationId,
            },
          });
          return;
        }
      }

      const data: any = {};

      if (fullName !== undefined) {
        if (typeof fullName !== "string" || fullName.trim().length === 0) {
          res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Full name cannot be empty",
              correlationId,
            },
          });
          return;
        }
        data.fullName = fullName.trim();
      }

      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof email !== "string" || !emailRegex.test(email.trim())) {
          res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "A valid email address is required",
              correlationId,
            },
          });
          return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail !== targetUser.email.toLowerCase()) {
          const duplicate = await prisma.user.findFirst({
            where: {
              email: { equals: normalizedEmail, mode: "insensitive" },
              id: { not: targetId },
            },
          });

          if (duplicate) {
            res.status(409).json({
              error: {
                code: "EMAIL_ALREADY_EXISTS",
                message: "Email is already in use by another user",
                correlationId,
              },
            });
            return;
          }
          data.email = normalizedEmail;
        }
      }

      if (role !== undefined) {
        if (!Object.values(Role).includes(role as Role)) {
          res.status(400).json({
            error: {
              code: "INVALID_ROLE",
              message: `Role must be one of: ${Object.values(Role).join(", ")}`,
              correlationId,
            },
          });
          return;
        }
        data.role = role as Role;
      }

      if (department !== undefined) {
        data.department = department && typeof department === "string" ? department.trim() : null;
      }

      if (isActive !== undefined) {
        data.isActive = Boolean(isActive);
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          department: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        user: {
          ...updatedUser,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
        message: "User updated successfully.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to update user:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user",
          correlationId,
        },
      });
    }
  }
);

// POST /api/admin/users/:id/reset-password - Reset password and enforce mustChangePassword = true
app.post(
  "/api/admin/users/:id/reset-password",
  requireAuth,
  requirePasswordChangeClear,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    const correlationId = `req-${randomUUID()}`;
    const prisma = getPrisma();

    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId) || targetId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "A valid positive integer user id is required",
            correlationId,
          },
        });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            correlationId,
          },
        });
        return;
      }

      const { newInitialPassword } = req.body || {};

      if (!newInitialPassword || typeof newInitialPassword !== "string") {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "A new initial password is required",
            correlationId,
          },
        });
        return;
      }

      const complexity = validatePasswordComplexity(newInitialPassword);
      if (!complexity.isValid) {
        res.status(400).json({
          error: {
            code: "INVALID_PASSWORD_COMPLEXITY",
            message:
              "Password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a digit, and a special symbol (@$!%*?&#^_-)",
            checklist: complexity.checklist,
            correlationId,
          },
        });
        return;
      }

      const passwordHash = await bcrypt.hash(newInitialPassword, 10);

      await prisma.user.update({
        where: { id: targetId },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      res.status(200).json({
        message: "Password reset successfully. User must change password at next login.",
      });
    } catch (error) {
      console.error(`[${correlationId}] Failed to reset user password:`, error);
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset password",
          correlationId,
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Global Error Handling Middleware (Express error middleware for malformed JSON, Multer & unhandled exceptions)
// ---------------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const correlationId = `req-${randomUUID()}`;

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

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      console.warn(`[${correlationId}] File size limit exceeded:`, err.message);
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "File exceeds 5MB size limit",
          correlationId,
        },
      });
      return;
    }
    console.warn(`[${correlationId}] Multer error:`, err.message);
    res.status(400).json({
      error: {
        code: "UPLOAD_ERROR",
        message: err.message,
        correlationId,
      },
    });
    return;
  }

  if (err && err.code === "UNSUPPORTED_MEDIA_TYPE") {
    console.warn(`[${correlationId}] Unsupported media type:`, err.message);
    res.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: err.message || "Unsupported file format. Only JPG, PNG, WEBP, and PDF are permitted.",
        correlationId,
      },
    });
    return;
  }

  console.error(`[${correlationId}] Unhandled server exception:`, err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred",
      correlationId,
    },
  });
});

export default app;