import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import {
  createMaterialSchema,
  updateMaterialSchema,
} from "../../middlewares/zodSchema";
import {
  deleteVideoFromCloudinary,
  uploadVideoToCloudinary,
} from "../../utils/uploadImage";

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

import { getMaterialsSchema } from "../../middlewares/zodSchema";

export const getMaterials = async (req: Request, res: Response) => {
  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const validatedQuery = getMaterialsSchema.safeParse(req.query);
  if (!validatedQuery.success) {
    throw new AppError("Invalid query parameters", 400);
  }

  const { search, classId, armId, subjectId, page, limit } =
    validatedQuery.data;

  const skip = (page - 1) * limit;

  const whereConditions: any = {
    schoolId: school.id,
  };

  if (classId) whereConditions.classId = classId;
  if (armId) whereConditions.armId = armId;
  if (subjectId) whereConditions.subjectId = subjectId;

  if (search) {
    whereConditions.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [materials, totalCount] = await Promise.all([
    queryWithRetry(() =>
      prisma.video.findMany({
        where: whereConditions,
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
          class: { select: { name: true } },
          subject: { select: { name: true } },
          arm: { select: { name: true } },
        },
        orderBy: { uploadedAt: "desc" },
        skip,
        take: limit,
      }),
    ),
    prisma.video.count({ where: whereConditions }),
  ]);

  res.status(200).json({
    success: true,
    message: "Materials fetched successfully",
    materials,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};

export const updateMaterial = async (req: Request, res: Response) => {
  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const materialId = parseInt(req.params.id as string);

  const existingMaterial = await queryWithRetry(() =>
    prisma.video.findFirst({
      where: {
        id: materialId,
        schoolId: school.id,
      },
    }),
  );
  if (!existingMaterial) {
    throw new AppError("Material not found", 404);
  }

  const validatedData = updateMaterialSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new AppError("Invalid input", 400);
  }

  const { title, description, classId, armId, subjectId } = validatedData.data;

  // Use updated classId or fall back to existing one
  const targetClassId = classId || existingMaterial.classId;

  // Validate class if classId is being updated
  if (classId) {
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
  }

  // Validate arm belongs to the class if provided
  if (armId) {
    const armRecord = await queryWithRetry(() =>
      prisma.arm.findFirst({
        where: {
          id: armId,
          classId: targetClassId,
        },
      }),
    );

    if (!armRecord) {
      throw new AppError("Arm not found or does not belong to this class", 404);
    }
  }

  // Validate subject belongs to the class if provided
  if (subjectId) {
    const subjectRecord = await queryWithRetry(() =>
      prisma.subject.findFirst({
        where: {
          id: subjectId,
          classId: targetClassId,
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

  const material = await queryWithRetry(() =>
    prisma.video.update({
      where: {
        id: materialId,
        schoolId: school.id,
      },
      data: {
        ...(title && { title: title.trim().toLowerCase() }),
        ...(description !== undefined && {
          description: description?.trim().toLowerCase() || null,
        }),
        ...(classId && { classId }),
        ...(armId !== undefined && { armId: armId || null }),
        ...(subjectId !== undefined && { subjectId: subjectId || null }),
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
        class: { select: { name: true } },
        subject: { select: { name: true } },
        arm: { select: { name: true } },
      },
    }),
  );

  res.status(200).json({
    success: true,
    message: "Material updated successfully",
    material,
  });
};

export const deleteMaterial = async (req: Request, res: Response) => {
  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const materialId = parseInt(req.params.id as string);

  // Check if material exists and belongs to this school
  const existingMaterial = await queryWithRetry(() =>
    prisma.video.findFirst({
      where: {
        id: materialId,
        schoolId: school.id,
      },
    }),
  );

  if (!existingMaterial) {
    throw new AppError("Material not found", 404);
  }

  // Delete from Cloudinary first
  if (existingMaterial.url) {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}.mp4
    const urlParts = existingMaterial.url.split("/");
    const publicId = urlParts
      .slice(urlParts.indexOf("upload") + 1)
      .join("/")
      .replace(/\.[^.]+$/, ""); // Remove file extension

    await deleteVideoFromCloudinary(publicId);
  }

  // Delete from database
  await queryWithRetry(() =>
    prisma.video.delete({
      where: {
        id: materialId,
        schoolId: school.id,
      },
    }),
  );

  res.status(200).json({
    success: true,
    message: "Material deleted successfully",
  });
};
