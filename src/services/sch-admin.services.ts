import { prisma } from "../utils/prismaClient";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";

interface GetMaterialsArgs {
  schoolId: number;
  studentId: number;
}

interface GetStudentAnalyticsArgs {
  schoolId: number;
  studentId: number;
}

export const getStudentForAnalytics = async ({
  schoolId,
  studentId,
}: GetStudentAnalyticsArgs) => {
  // 1️⃣ Get student details
  const student = await queryWithRetry(() =>
    prisma.user.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        class: {
          select: {
            id: true,
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

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  // 2️⃣ Get total materials for student's class
  const totalMaterials = await queryWithRetry(() =>
    prisma.video.count({
      where: {
        classId: student?.class?.id,
        schoolId,
      },
    }),
  );

  // 3️⃣ Get completed materials count
  const completedCount = await queryWithRetry(() =>
    prisma.videoProgress.count({
      where: {
        studentId: student.id,
        isCompleted: true,
      },
    }),
  );

  // 4️⃣ Get materials with progress
  const classMaterials = await queryWithRetry(() =>
    prisma.video.findMany({
      where: {
        classId: student?.class?.id,
        schoolId,
      },
      select: {
        id: true,
        title: true,
        duration: true,
        uploadedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        videoProgresses: {
          where: {
            studentId: student.id,
          },
          select: {
            progressPercent: true,
            isCompleted: true,
            watchedDuration: true,
            lastWatchedAt: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    }),
  );

  return {
    student,
    stats: {
      totalMaterials,
      completedCount,
    },
    classMaterials,
  };
};
