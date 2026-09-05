import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import multer from "multer";
import fs from "fs";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput, PriorityType } from "./utils/ticket-validation.js";
import { parseTicketQueryParams } from "./utils/ticket-query.js";
import { uploadMiddleware } from "./utils/upload.js";

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
  const correlationId = `req-${randomUUID()}`;
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
  const correlationId = `req-${randomUUID()}`;
  try {
    // Support requester identity duality with header taking absolute precedence
    const headerRequesterId = req.headers["x-requester-id"]
      ? Number(req.headers["x-requester-id"])
      : undefined;

    const payload =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? {
            ...req.body,
            requesterId: headerRequesterId ?? req.body.requesterId,
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
// Lab 2 Endpoint 6 — GET /api/tickets/:id
// Retrieve complete details and attachments for a single ticket, strictly enforcing ownership (BR-08 / AC-13)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId },
      });
      return;
    }

    // Header identity takes absolute precedence over query parameter
    const requesterIdRaw = req.headers["x-requester-id"] ?? req.query.requesterId;
    if (!requesterIdRaw) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Requester identity is required", correlationId },
      });
      return;
    }

    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid requester ID", correlationId },
      });
      return;
    }

    const prisma = getPrisma();

    // Verify requester exists and is active before querying ticket
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });
    if (!requester) {
      console.warn(`[${correlationId}] Active requester not found: id=${requesterId}`);
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active requester not found", correlationId },
      });
      return;
    }

    // Ownership applied directly as a SQL where predicate (BR-08 / AC-03 / AC-13)
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: requester.id },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        category: {
          select: { id: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
        attachments: {
          orderBy: { uploadedAt: "asc" },
        },
      },
    });

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
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
      ticketOwner: ticket.ticketOwner,
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
app.post("/api/tickets/:id/attachments", uploadMiddleware.single("file"), async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ticket ID", correlationId } });
      return;
    }

    // Header identity takes absolute precedence over multipart body
    const requesterIdRaw = req.headers["x-requester-id"] ?? req.body?.requesterId;
    if (!requesterIdRaw) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Requester identity is required", correlationId } });
      return;
    }

    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid requester ID", correlationId } });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Attachment file is required", correlationId } });
      return;
    }

    const prisma = getPrisma();

    // Verify requester exists and is active before querying ticket
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });
    if (!requester) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active requester not found", correlationId },
      });
      return;
    }

    // Strict ownership applied directly as a SQL where predicate (BR-08)
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: requester.id },
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
        uploadedById: requester.id,
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
app.get("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const ticketId = parseInt(req.params.id, 10);
    // Header identity takes absolute precedence over query parameter
    const requesterIdRaw = req.headers["x-requester-id"] ?? req.query.requesterId;
    if (isNaN(ticketId) || !requesterIdRaw) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }
    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid requester ID", correlationId } });
      return;
    }

    const prisma = getPrisma();

    // Verify requester exists and is active before querying ticket
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active requester not found", correlationId },
      });
      return;
    }

    // Strict ownership applied directly as a SQL where predicate (BR-08)
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: requester.id },
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
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const attachmentId = parseInt(req.params.id, 10);
    // Header identity takes absolute precedence over query parameter
    const requesterIdRaw = req.headers["x-requester-id"] ?? req.query.requesterId;
    if (isNaN(attachmentId) || !requesterIdRaw) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }
    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid requester ID", correlationId } });
      return;
    }

    const prisma = getPrisma();

    // Verify requester exists and is active before querying attachment
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active requester not found", correlationId },
      });
      return;
    }

    // Strict ownership applied directly as a SQL where predicate through relation (BR-08)
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: { requesterId: requester.id },
      },
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
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  const correlationId = `req-${randomUUID()}`;
  try {
    const attachmentId = parseInt(req.params.id, 10);
    // Header identity takes absolute precedence over request body to prevent tenant spoofing
    const requesterIdRaw = req.headers["x-requester-id"] ?? req.body?.requesterId;
    const reason = req.body?.reason;

    if (isNaN(attachmentId) || !requesterIdRaw) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", correlationId } });
      return;
    }
    const requesterId = parseInt(String(requesterIdRaw), 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid requester ID", correlationId } });
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

    // Verify requester exists and is active before querying attachment
    const requester = await prisma.requesterUser.findFirst({
      where: { id: requesterId, isActive: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active requester not found", correlationId },
      });
      return;
    }

    // Strict ownership applied directly as a SQL where predicate through relation (BR-08)
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: { requesterId: requester.id },
      },
    });

    if (!attachment) {
      res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found", correlationId } });
      return;
    }

    if (attachment.removedAt !== null) {
      res.status(409).json({
        error: { code: "ALREADY_REMOVED", message: "Attachment is already removed", correlationId },
      });
      return;
    }

    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        removedAt: new Date(),
        removedById: requester.id,
        removalReason: reason.trim(),
      },
    });

    res.status(200).json({
      id: updated.id,
      fileName: updated.fileName,
      removedAt: updated.removedAt,
      removedById: updated.removedById,
      removalReason: updated.removalReason,
      isRemoved: true,
    });
  } catch (error) {
    console.error(`[${correlationId}] Failed to soft-remove attachment:`, error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to remove attachment", correlationId },
    });
  }
});

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
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred",
      correlationId,
    },
  });
});

export default app;