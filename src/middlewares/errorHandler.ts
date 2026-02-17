import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ✅ Only log in development
  if (process.env.NODE_ENV === "development") {
    console.error("=== ERROR HANDLER ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("=====================");
  }

  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // JWT safety net
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if ((err as any).code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Record already exists",
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
