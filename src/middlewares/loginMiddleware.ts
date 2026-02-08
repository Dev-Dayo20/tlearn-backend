import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prismaClient";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

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
    }
  }
}

export const authSchoolUsersLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let subdomain = req.headers["x-school-subdomain"] as string | undefined;

  //Fallback: Try to extract from hostname (for production without proxy)
  if (!subdomain) {
    const host = req.hostname;
    const parts = host.split(".");

    // DEV: markaz.localhost
    if (host.endsWith(".localhost") && parts.length === 2) {
      subdomain = parts[0];
    }

    // PROD: markaz.yourapp.com OR markaz.school.yourapp.com
    if (!subdomain && parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  // Validate subdomain exists
  if (!subdomain) {
    throw new AppError("School subdomain is required", 400);
  }

  // Validate subdomain format (only lowercase letters)
  if (!/^[a-z]+$/.test(subdomain)) {
    throw new AppError("Invalid school format", 400);
  }

  // Find school by subdomain
  const schoolExists = await queryWithRetry(() =>
    prisma.school.findUnique({
      where: {
        subdomain: subdomain.toLowerCase(),
        isActive: true,
      },
    }),
  );

  if (!schoolExists) {
    throw new AppError("School not found or inactive", 404);
  }

  req.school = schoolExists;
  // console.log(req.school);
  next();
};

export const attachSchoolContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let subdomain = req.headers["x-school-subdomain"] as string | undefined;

    // Fallback: Try to extract from hostname
    if (!subdomain) {
      const host = req.hostname;
      const parts = host.split(".");

      if (host.endsWith(".localhost") && parts.length === 2) {
        subdomain = parts[0];
      }

      if (!subdomain && parts.length >= 3) {
        subdomain = parts[0];
      }
    }

    if (!subdomain) {
      throw new AppError("School subdomain is required", 400);
    }

    if (!/^[a-z]+$/.test(subdomain)) {
      throw new AppError("Invalid school format", 400);
    }

    const schoolExists = await queryWithRetry(() =>
      prisma.school.findUnique({
        where: {
          subdomain: subdomain.toLowerCase(),
          isActive: true,
        },
      }),
    );

    if (!schoolExists) {
      throw new AppError("School not found or inactive", 404);
    }

    req.school = schoolExists;
    next();
  },
);
