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
        .regex(
          /^[A-Z]{3}\/[A-Z]{3}\/\d{5}$/,
          "Invalid student ID format (e.g., MUW/NUR/00009)",
        )
        .toUpperCase(),
      role: z.literal("STUDENT"),
      schoolId: z.number().int().positive(),
    })
    .strict(),
};

export const createClassSchema = z
  .object({
    name: z.string().min(1, "Class name is required"),
    teacher: z.number().optional(),
    arms: z.array(z.string().min(1)).optional(),
    subjects: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const getClassesSchema = z
  .object({
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
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  })
  .strict();

export const createTeacherSchema = z
  .object({
    name: z.string().min(1, "Teacher's name is required"),
    email: z.email("Invalid email address"),
    phoneNumber: z.string().optional().nullable(),
    profilePicture: z.string().optional().nullable().or(z.literal("")),
    password: z.string().min(6, "Password is required"),
  })
  .strict();

export const createStudentSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email().optional().or(z.literal("")), // Optional email
    classId: z.number().int().positive(),
    armId: z.number().int().positive().optional(),
    dateOfBirth: z.string().optional().or(z.literal("")), // Optional date of birth
    profilePicture: z.string().url().nullable().optional().or(z.literal("")),
  })
  .strict();

export const createMaterialSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    classId: z.coerce.number().int().positive(),
    armId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const getMaterialsSchema = z
  .object({
    search: z.string().max(100).trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    armId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  })
  .strict();

export const updateMaterialSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    classId: z.coerce.number().int().positive().optional(),
    armId: z.coerce.number().int().positive().optional().nullable(),
    subjectId: z.coerce.number().int().positive().optional().nullable(),
  })
  .strict();

//UPDATE TEACHER INFO
export const updateTeacherSchema = z
  .object({
    name: z.string().min(1, "Teacher's name is required").optional(),
    email: z.email("Invalid email address").optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9\s\-\(\)]{7,15}$/, "Invalid phone number format")
      .optional()
      .nullable(),
    profilePicture: z.string().url("Invalid URL").optional().nullable(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  })
  .strict();

export const paginationQuerySchema = z
  .object({
    search: z.string().optional(),
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => parseInt(val))
      .pipe(z.number().min(1, "Page must be at least 1")),
    limit: z
      .string()
      .optional()
      .default("10")
      .transform((val) => parseInt(val))
      .pipe(z.number().min(1).max(100, "Limit cannot exceed 100")),
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const updateStudentSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.email().optional().nullable().or(z.literal("")),
    classId: z.number().int().positive().optional(),
    armId: z.number().int().positive().optional().nullable(),
    dateOfBirth: z.string().optional().nullable().or(z.literal("")),
    profilePicture: z.string().url().optional().nullable().or(z.literal("")),
  })
  .strict();

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const createSubjectSchema = z
  .object({
    name: z
      .string()
      .min(2, "Subject name must be at least 2 characters")
      .max(100, "Subject name too long"),
    classId: z.number().int().positive("Invalid class ID"),
    teacherId: z
      .number()
      .int()
      .positive("Invalid teacher ID")
      .optional()
      .nullable(),
  })
  .strict();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = z
  .object({
    name: z
      .string()
      .min(2, "Subject name must be at least 2 characters")
      .max(100, "Subject name too long")
      .optional(),
    classId: z.number().int().positive("Invalid class ID").optional(),
    teacherId: z
      .number()
      .int()
      .positive("Invalid teacher ID")
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const getSubjectsPaginationSchema = z
  .object({
    search: z.string().optional(),
    classId: z.coerce.number().int().positive().optional(),
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => parseInt(val))
      .pipe(z.number().min(1, "Page must be at least 1")),
    limit: z
      .string()
      .optional()
      .default("10")
      .transform((val) => parseInt(val))
      .pipe(z.number().min(1).max(100, "Limit cannot exceed 100")),
  })
  .strict();
export type GetSubjectsPaginationQuery = z.infer<
  typeof getSubjectsPaginationSchema
>;

export const assignTeacherToClassSchema = z
  .object({
    subjectId: z.number().int().positive("Invalid subject ID"),
  })
  .strict();

export type AssignTeacherToClassInput = z.infer<
  typeof assignTeacherToClassSchema
>;

export const removeTeacherFromSubjectSchema = z
  .object({
    subjectId: z.number().int().positive("Invalid subject ID"),
  })
  .strict();

export const getStudentLessonsSchema = z
  .object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => parseInt(val))
      .pipe(z.number().int().min(1, "Page must be at least 1")),
    limit: z
      .string()
      .optional()
      .default("12")
      .transform((val) => parseInt(val))
      .pipe(
        z.number().int().min(1).max(50, "Limit cannot exceed 50"),
      ),
    search: z.string().max(100, "Search query too long").trim().optional(),
    subject: z.string().max(100).trim().optional(),
    type: z.string().max(50, "Type query too long").trim().optional(),
    sortBy: z
      .enum(["date", "title", "progress"])
      .optional()
      .default("date"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

export type GetStudentLessonsQuery = z.infer<typeof getStudentLessonsSchema>;
