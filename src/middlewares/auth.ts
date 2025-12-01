import { Request, Response, NextFunction } from "express";
import { verifyToken, decodeToken } from "../utils/Utils";
import { AUthPayload } from "../utils/types";
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: AUthPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = decodeToken(token);

    if (!decoded) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ message: "Token has expired" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const requiredSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    res.status(403).json({ error: "Super Admin access required" });
    return;
  }

  next();
};

export const requireSchAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPER_ADMIN) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({
        error: `Access denied. Allowed roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
