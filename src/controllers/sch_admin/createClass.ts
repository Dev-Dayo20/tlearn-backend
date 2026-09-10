import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { createClassSchema } from "../../middlewares/zodSchema";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createClassSchema.safeParse(req.body);

  if (!validatedData.success) {
    throw new AppError("Invalid input", 400);
  }

  const { name, teacher, arms, subjects } = validatedData.data;

  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const existingClass = await queryWithRetry(() =>
    prisma.class.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
        schoolId: school.id,
      },
    }),
  );

  if (existingClass) {
    throw new AppError("Class already exists", 409);
  }

  const newClass = await queryWithRetry(() =>
    prisma.class.create({
      data: {
        name: name.trim().toLowerCase(),
        schoolId: school.id,
        teacherId: teacher || null,
        arms: arms?.length
          ? {
              create: arms
                .filter((armName) => armName.trim())
                .map((armName) => ({
                  name: armName.trim().toLowerCase(),
                  schoolId: school.id,
                })),
            }
          : undefined,
        subjects: subjects?.length
          ? {
              create: subjects
                .filter((subjectName) => subjectName.trim())
                .map((subjectName) => ({
                  name: subjectName.trim().toLowerCase(),
                })),
            }
          : undefined,
      },
      include: {
        arms: true,
        subjects: true,
        teacher: { select: { id: true, name: true } },
      },
    }),
  );

  res
    .status(201)
    .json({ success: true, message: "Class created successfully", newClass });
});

export const classes = asyncHandler( async (req: Request, res: Response) => {
  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const classes = await queryWithRetry(() =>
    prisma.class.findMany({
      where: { schoolId: school.id },
      include: {
        arms: true,
        subjects: true,
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  );
  res.status(200).json({
    success: true,
    message: "Classes retrieved successfully",
    classes,
  });
})
