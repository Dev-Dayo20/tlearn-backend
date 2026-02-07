import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { createClassSchema } from "../../middlewares/zodSchema";
import { AppError } from "../../utils/AppError";
import { createTeacherSchema } from "../../middlewares/zodSchema";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../utils/asyncHandler";

export const createTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const validateData = createTeacherSchema.safeParse(req.body);

    if (!validateData.success) {
      throw new AppError("Invalid fields", 400);
    }

    const { name, email, password } = validateData.data;
    const school = req.school;

    if (!school) {
      throw new AppError("School not found", 400);
    }

    const existingEmail = await queryWithRetry(() =>
      prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      }),
    );

    if (existingEmail) {
      throw new AppError("Email already in use", 400);
    }

    const existingTeacher = await queryWithRetry(() =>
      prisma.user.findFirst({
        where: {
          name: { equals: name.trim(), mode: "insensitive" },
          schoolId: req.school?.id,
          role: "TEACHER",
        },
      }),
    );

    if (existingTeacher) {
      throw new AppError(
        "Teacher with this name already exists in your school",
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = await queryWithRetry(() =>
      prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: "TEACHER",
          schoolId: req.school?.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          schoolId: true,
          isActive: true,
          createdAt: true,
        },
      }),
    );

    return res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      newTeacher,
    });
  },
);

export const getTeachers = asyncHandler(async (req: Request, res: Response) => {
  const school = req.school;

  if (!school) {
    throw new AppError("School not found", 400);
  }

  const teachers = await queryWithRetry(() =>
    prisma.user.findMany({
      where: {
        schoolId: school.id,
        role: "TEACHER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  );

  return res.status(200).json({
    success: true,
    teachers,
  });
});
