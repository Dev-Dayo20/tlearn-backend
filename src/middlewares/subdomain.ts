import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prismaClient";
import { AUthPayload } from "../utils/types";
import { queryWithRetry } from "../utils/Utils";

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
  next: NextFunction
) => {
  try {
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
      })
    );

    // Check if school exists
    if (!school) {
      res.status(404).json({
        message: "School not found",
        subdomain,
      });
      return;
    }

    if (!school.isActive) {
      res.status(403).json({
        message: "School is inactive",
        subdomain,
      });
      return;
    }

    req.school = school;
    next();
  } catch (error) {
    console.error("Subdomain detection error:", error);
    res.status(500).json({ message: "Internal server error." });
    return;
  }
};

export const requireSchool = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.school) {
    res.status(400).json({ message: "School context required" });
    return;
  }
  next();
};

export const requireSchoolMatch = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (!req.school) {
    res.status(400).json({ message: "School context required" });
    return;
  }

  // Super Admin can access any school
  if (req.user.role === "SUPER_ADMIN") {
    next();
    return;
  }

  // Check if user's school matches the subdomain school
  if (req.user.schoolId !== req.school.id) {
    res.status(403).json({
      message: "Access denied. You don't belong to this school.",
    });
    return;
  }

  next();
};
