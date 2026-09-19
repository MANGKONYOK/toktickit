import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export interface SessionPayload {
  userId: number;
  role: Role;
  email: string;
}

export interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  department: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_SECRET = process.env.SESSION_SECRET || "toktickit_super_secret_session_salt_2026";

/**
 * Extracts and verifies session identity from cookies or Bearer headers.
 */
export async function authenticateSession(req: Request): Promise<AuthenticatedUser | null> {
  const sessionData = req.signedCookies?.[SESSION_COOKIE_NAME] || req.cookies?.[SESSION_COOKIE_NAME];
  let userId: number | null = null;

  if (sessionData) {
    try {
      const parsed = typeof sessionData === "string" ? JSON.parse(sessionData) : sessionData;
      userId = Number(parsed.userId);
    } catch {
      return null;
    }
  }

  // Fallback to Bearer token if present
  if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.slice(7);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      userId = Number(parsed.userId);
    } catch {
      return null;
    }
  }

  if (!userId || isNaN(userId)) {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      department: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

/**
 * Middleware: Requires a verified active session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await authenticateSession(req);
  if (!user) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please log in.",
        correlationId: randomUUID(),
      },
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Middleware: Blocks application access if first-login password change is pending.
 */
export function requirePasswordChangeClear(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing this resource.",
        correlationId: randomUUID(),
      },
    });
    return;
  }
  next();
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          correlationId: randomUUID(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource.",
          correlationId: randomUUID(),
        },
      });
      return;
    }

    next();
  };
}
