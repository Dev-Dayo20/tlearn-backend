import { prisma } from "../utils/prismaClient";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// Check unique email, excluding a specific user (for updates)
export const validateUniqueEmail = async (
  email: string,
  excludeId?: string,
) => {
  const existing = await queryWithRetry(() =>
    prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        ...(excludeId && { NOT: { id: parseInt(excludeId) } }),
      },
    }),
  );

  if (existing) {
    throw new AppError("Email already in use", 400);
  }
};

// Check a record exists in any model
export const validateExists = async <T>(
  queryFn: () => Promise<T | null>,
  errorMessage: string,
  statusCode = 404,
): Promise<T> => {
  const record = await queryWithRetry(queryFn);

  if (!record) {
    throw new AppError(errorMessage, statusCode);
  }

  return record;
};

type ValidationSource = "body" | "query" | "params";
export const validate = (
  schema: z.ZodSchema,
  source: ValidationSource = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);

      // Use Object.defineProperty to override read-only properties like req.query in Express 5
      Object.defineProperty(req, source, {
        value: validatedData,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || "Validation failed";
        throw new AppError(message, 400);
      }
      next(error);
    }
  };
};
