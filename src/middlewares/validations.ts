import { body, validationResult, query } from "express-validator";
import { Request, Response, NextFunction } from "express";
import validator from "validator";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

export const validateCreateSchool = [
  // School name
  body("schoolName")
    .trim()
    .notEmpty()
    .withMessage("School name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("School name must be 2-100 characters")
    .escape(),

  // Subdomain
  body("subdomain")
    .trim()
    .notEmpty()
    .withMessage("Subdomain is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Subdomain must be 3-30 characters")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Subdomain can only contain lowercase letters, numbers, and hyphens"
    )
    .toLowerCase(),

  // School email
  body("schoolEmail")
    .trim()
    .notEmpty()
    .withMessage("School email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Admin name
  body("adminName")
    .trim()
    .notEmpty()
    .withMessage("Admin name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Admin name must be 2-100 characters")
    .escape(),

  // Admin email
  body("adminEmail")
    .trim()
    .notEmpty()
    .withMessage("Admin email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  // Admin password
  body("adminPassword")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),

  // Address
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required") // ← Made required (matches frontend)
    .isLength({ min: 5, max: 200 })
    .withMessage("Address must be 5-200 characters")
    .escape(),
];

/**
 * Validation rules for login
 */
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

export const userPagination = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),

  query("role")
    .optional()
    .isIn(["ADMIN", "STUDENT"])
    .withMessage("Invalid role")
    .toUpperCase()
    .trim()
    .escape()
    .isLength({ max: 20 })
    .withMessage("Role query too long"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1")
    .toInt()
    .default(1)
    .trim()
    .escape(),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Page size must be between 1 and 100")
    .toInt(),
];

const allowedQueryFields = ["search", "role", "page", "pageSize"];

export const stripUnknownQueries = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Object.keys(req.query).forEach((key) => {
    if (!allowedQueryFields.includes(key)) {
      delete req.query[key];
    }
  });
  next();
};

export function sanitizeInput(input: string): string {
  // Remove null bytes
  let cleaned = input.replace(/\0/g, "");

  // Escape HTML
  cleaned = validator.escape(cleaned);

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
