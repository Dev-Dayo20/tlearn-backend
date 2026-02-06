import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prismaClient";
import { AUthPayload } from "../utils/types";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";
import { Role } from "@prisma/client";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      school?: {
        id: number;
        name: string;
        subdomain: string;
        logo?: string | null;
        email: string;
      };
      subdomain?: string;
    }
  }
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  // For localhost development, check if format is subdomain.localhost
  if (host.includes("localhost")) {
    const parts = host.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      return parts[0];
    }
    return null;
  }

  // For production (e.g., greenfield.tlearn.com)
  const parts = host.split(".");
  if (parts.length < 3) {
    return null;
  }

  // Don't treat 'www' as a subdomain
  if (parts[0] === "www") {
    return null;
  }
  return parts[0];
}

export const detectSubdomain = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const hostname = req.hostname || req.headers.host || "";
  const subdomain = extractSubdomain(hostname);

  // Attach subdomain to request (even if null)
  req.subdomain = subdomain || undefined;

  // If no subdomain, continue without loading school
  if (!subdomain) {
    next();
    return;
  }

  const school = await queryWithRetry(() =>
    prisma.school.findUnique({
      where: { subdomain: subdomain },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo: true,
        email: true,
        isActive: true,
      },
    }),
  );

  // Check if school exists
  if (!school) {
    throw new AppError("School not found", 404);
  }

  if (!school.isActive) {
    throw new AppError("School is inactive", 409);
  }

  req.school = school;
  next();
};

export const requireSchAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const allowedRoles = [Role.ADMIN, Role.SUPER_ADMIN];

  if (!req.school) {
    throw new AppError("School context required", 400);
  }

  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPER_ADMIN) {
    throw new AppError("Admin access required", 403);
  }

  // Check if user's school matches the subdomain school
  if (req.user.schoolId !== req.school.id) {
    throw new AppError("Access denied. You don't belong to this school.", 403);
  }

  next();
};

export const requiredSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    throw new AppError("Super Admin access required", 403);
  }

  next();
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new AppError("Access Denied", 403);
    }

    next();
  };
};
