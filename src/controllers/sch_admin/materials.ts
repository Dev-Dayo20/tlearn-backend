import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import {
  createMaterialSchema,
  updateMaterialSchema,
  getMaterialsSchema,
} from "../../middlewares/zodSchema";
import {
  deleteVideoFromCloudinary,
  uploadVideoToCloudinary,
} from "../../utils/uploadImage";
import { getStudentForAnalytics } from "../../services/sch-admin.services";
import { asyncHandler } from "../../utils/asyncHandler";

export const createMaterial = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = createMaterialSchema.safeParse(req.body);

    if (!validatedData.success) {
      throw new AppError("Invalid input", 400);
    }

    const { title, description, classId, armId, subjectId } =
      validatedData.data;

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
        throw new AppError(
          "Arm not found or does not belong to this class",
          404,
        );
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
  },
);

export const getMaterials = asyncHandler(
  async (req: Request, res: Response) => {
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
  },
);

export const updateMaterial = asyncHandler(
  async (req: Request, res: Response) => {
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

    const { title, description, classId, armId, subjectId } =
      validatedData.data;

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
        throw new AppError(
          "Arm not found or does not belong to this class",
          404,
        );
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
  },
);

export const deleteMaterial = asyncHandler(
  async (req: Request, res: Response) => {
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
  },
);

export const updateVideoProgress = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const videoId = parseInt(req.params.videoId as string);
    const { watchedDuration, videoDuration } = req.body;

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!videoId) {
      throw new AppError("Video ID is required", 400);
    }

    if (!watchedDuration || !videoDuration) {
      throw new AppError(
        "Watched duration and video duration are required",
        400,
      );
    }

    // Calculate progress percentage
    const progressPercent = Math.min(
      Math.round((watchedDuration / videoDuration) * 100),
      100,
    );

    // Consider completed if watched 90% or more
    const isCompleted = progressPercent >= 90;

    // Upsert (update if exists, create if doesn't)
    const progress = await queryWithRetry(() =>
      prisma.videoProgress.upsert({
        where: {
          studentId_videoId: {
            studentId: user.id,
            videoId: videoId,
          },
        },
        update: {
          watchedDuration,
          progressPercent,
          isCompleted,
          lastWatchedAt: new Date(),
        },
        create: {
          studentId: user.id,
          videoId: videoId,
          watchedDuration,
          progressPercent,
          isCompleted,
        },
      }),
    );

    res.status(200).json({
      success: true,
      message: "Progress updated",
      progress,
    });
  },
);

export const getStudentAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("School not found", 404);
    }

    const studentId = parseInt(req.params.id as string);

    // Get all student data in one call
    const { student, stats, classMaterials } = await getStudentForAnalytics({
      schoolId: school.id,
      studentId,
    });

    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Calculate overall progress
    const progress =
      stats.totalMaterials > 0
        ? Math.round((stats.completedCount / stats.totalMaterials) * 100)
        : 0;

    // Determine enrollment status based on progress
    let enrollmentStatus: "Active" | "Warning" | "Inactive";
    if (!student.isActive) {
      enrollmentStatus = "Inactive";
    } else if (progress < 30) {
      enrollmentStatus = "Warning";
    } else {
      enrollmentStatus = "Active";
    }

    // Completed materials (watched >= 90%)
    const completedMaterials = classMaterials
      .filter((m) => m.videoProgresses[0]?.isCompleted)
      .slice(0, 10)
      .map((material) => ({
        title: material.title,
        date: material.videoProgresses[0].lastWatchedAt.toISOString(),
        progress: material.videoProgresses[0].progressPercent,
      }));

    // Pending materials (not started or < 90% watched)
    const pendingMaterials = classMaterials
      .filter((m) => !m.videoProgresses[0]?.isCompleted)
      .slice(0, 10)
      .map((material) => ({
        title: material.title,
        progress: material.videoProgresses[0]?.progressPercent || 0,
        dueDate: new Date(
          material.uploadedAt.getTime() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 2 weeks from upload
      }));

    // Subject performance based on completion rates
    const subjectGroups = classMaterials.reduce(
      (acc, material) => {
        const subjectName = material.subject?.name || "General";
        if (!acc[subjectName]) {
          acc[subjectName] = { total: 0, completed: 0 };
        }
        acc[subjectName].total++;
        if (material.videoProgresses[0]?.isCompleted) {
          acc[subjectName].completed++;
        }
        return acc;
      },
      {} as Record<string, { total: number; completed: number }>,
    );

    const subjectPerformance = Object.entries(subjectGroups).map(
      ([subject, stats]) => ({
        subject,
        score:
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
        fullMark: 100,
      }),
    );

    // Progress timeline (last 8 weeks)
    const weeksAgo = 8;
    const progressTimeline = await Promise.all(
      Array.from({ length: weeksAgo }, async (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (weeksAgo - i) * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weeklyProgress = await queryWithRetry(() =>
          prisma.videoProgress.findMany({
            where: {
              studentId: student.id,
              lastWatchedAt: {
                gte: weekStart,
                lt: weekEnd,
              },
            },
            select: {
              progressPercent: true,
              isCompleted: true,
            },
          }),
        );

        const avgProgress =
          weeklyProgress.length > 0
            ? Math.round(
                weeklyProgress.reduce((sum, p) => sum + p.progressPercent, 0) /
                  weeklyProgress.length,
              )
            : 0;

        const completionRate =
          weeklyProgress.length > 0
            ? Math.round(
                (weeklyProgress.filter((p) => p.isCompleted).length /
                  weeklyProgress.length) *
                  100,
              )
            : 0;

        return {
          week: `Week ${i + 1}`,
          progress: avgProgress,
          completion: completionRate,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Student analytics retrieved successfully",
      analytics: {
        student: {
          id: student.id.toString(),
          name: student.name,
          class:
            student?.class?.name +
            (student?.arm ? ` - ${student?.arm?.name}` : ""),
          avatar: student.profilePicture || "",
          enrollmentStatus,
          email: student.email || "",
          phone: "", // Add to schema if needed
          joinedDate: student.createdAt.toISOString(),
          progress,
        },
        studentDetails: {
          progressTimeline,
          subjectPerformance,
          completedMaterials,
          pendingMaterials,
          teacherNotes: [],
        },
      },
    });
  },
);
