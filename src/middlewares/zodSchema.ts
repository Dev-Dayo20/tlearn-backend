import { z } from "zod";

export const SchoolLoginSchema = {
  ADMIN: z
    .object({
      email: z.string().email("Invalid email format").toLowerCase(),
      password: z.string().min(1, "Password is required"),
      role: z.literal("ADMIN"),
      schoolId: z.number().int().positive(),
    })
    .strict(),

  TEACHER: z
    .object({
      email: z.string().email("Invalid email format").toLowerCase(),
      password: z.string().min(1, "Password is required"),
      role: z.literal("TEACHER"),
      schoolId: z.number().int().positive(),
    })
    .strict(),

  STUDENT: z
    .object({
      studentId: z
        .string()
        .regex(/^STU-\d{4}-\d{5}$/, "Invalid student ID format")
        .toUpperCase(),
      role: z.literal("STUDENT"),
      schoolId: z.number().int().positive(),
    })
    .strict(),
};

export const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  teacher: z.string().optional(),
  arms: z.array(z.string().min(1)).optional(),
  subjects: z.array(z.string().min(1)).optional(),
});

export const getClassesSchema = z.object({
  search: z.string().max(100).trim().optional(),
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a positive integer")
    .transform(Number)
    .refine((n) => n > 0, "Page must be greater than 0")
    .default(1),
  pageSize: z
    .string()
    .regex(/^\d+$/, "Page size must be a positive integer")
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, "Page size must be between 1 and 100")
    .default(10),
  isActive: z.enum(["true", "false"]).optional(),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
