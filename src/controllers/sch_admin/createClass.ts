import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { createClassSchema } from "../../middlewares/zodSchema";
import { AppError } from "../../utils/AppError";

export const createClass = async (req: Request, res: Response) => {
  const validatedData = createClassSchema.safeParse(req.body);

  if (!validatedData.success) {
    throw new AppError("Invalid input", 400);
  }

  const { name, teacher, arms } = validatedData.data;

  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const existingClass = await queryWithRetry(() =>
    prisma.class.findFirst({
      where: {
        name: name,
        schoolId: school.id,
      },
    })
  );

  if (existingClass) {
    throw new AppError("Class already exists", 409);
  }

  const newClass = await queryWithRetry(() =>
    prisma.class.create({
      data: {
        name: name,
        schoolId: school.id,
        arms: arms?.length
          ? { create: arms.map((armName) => ({ name: armName })) }
          : undefined,
      },
      include: { arms: true },
    })
  );

  res
    .status(201)
    .json({ success: true, message: "Class created successfully", newClass });
};
