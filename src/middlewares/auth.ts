import { Request, Response, NextFunction } from "express";
import { verifyToken, decodeToken } from "../utils/Utils";
import { AUthPayload } from "../utils/types";

import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

declare global {
  namespace Express {
    interface Request {
      user?: AUthPayload;
    }
  }
}

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.substring(7);
    const decoded = decodeToken(token);

    if (!decoded) {
      throw new AppError("Invalid token", 401);
    }

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new AppError("Session expired. Please login again", 401);
    }

    verifyToken(token);

    req.user = decoded;
    next();
  },
);
