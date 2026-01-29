import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import { createMaterialSchema } from "../../middlewares/zodSchema";
import { uploadVideoToCloudinary } from "../../utils/uploadImage";

export const createMaterial = async (req: Request, res: Response) => {
  const validatedData = createMaterialSchema.safeParse(req.body);

  if (!validatedData.success) {
    throw new AppError("Invalid input", 400);
  }

  const { title, description, classId, armId, subjectId } = validatedData.data;

  // Check if file was uploaded
  if (!req.file) {
    throw new AppError("Video file is required", 400);
  }

  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const classRecord = await queryWithRetry(() =>
    prisma.class.findUnique({
      where: {
        id: classId,
        schoolId: school.id,
      },
    }),
  );

  if (!classRecord) {
    throw new AppError("Class not found", 404);
  }

  if (armId) {
    const armRecord = await queryWithRetry(() =>
      prisma.arm.findFirst({
        where: {
          id: armId,
          classId: classId,
        },
      }),
    );

    if (!armRecord) {
      throw new AppError("Arm not found or does not belong to this class", 404);
    }
  }

  if (subjectId) {
    const subjectRecord = await queryWithRetry(() =>
      prisma.subject.findFirst({
        where: {
          id: subjectId,
          classId: classId,
        },
      }),
    );

    if (!subjectRecord) {
      throw new AppError(
        "Subject not found or does not belong to this class",
        404,
      );
    }
  }

  const uploadResult = await uploadVideoToCloudinary(req.file, {
    schoolId: school.id,
    title,
  });

  // Create material in database
  const material = await queryWithRetry(() =>
    prisma.video.create({
      data: {
        title: title.trim().toLowerCase(),
        description: description?.trim().toLowerCase() || null,
        url: uploadResult.secure_url,
        schoolId: school.id,
        classId,
        armId: armId || null,
        subjectId: subjectId || null,
        duration: uploadResult.duration
          ? Math.round(uploadResult.duration)
          : null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        classId: true,
        armId: true,
        subjectId: true,
        duration: true,
        uploadedAt: true,
        class: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
        arm: {
          select: {
            name: true,
          },
        },
      },
    }),
  );

  res.status(201).json({
    success: true,
    message: "Material created successfully",
    material,
  });
};
