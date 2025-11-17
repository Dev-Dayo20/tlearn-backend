import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import validator from "validator";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
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
    .isLength({ min: 3, max: 30 })
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
    .withMessage("Password must be at least 8 characters"),

  // Address (optional)
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address too long")
    .escape(),

  // Logo URL (optional)
  body("logo").optional().trim().isURL().withMessage("Invalid logo URL"),
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

export function sanitizeInput(input: string): string {
  // Remove null bytes
  let cleaned = input.replace(/\0/g, "");

  // Escape HTML
  cleaned = validator.escape(cleaned);

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
