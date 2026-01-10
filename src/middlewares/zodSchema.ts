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
});
