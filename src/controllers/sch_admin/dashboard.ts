import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";

export const getDashboardStats = async (req: Request, res: Response) => {
  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel for performance
  const [
    totalStudents,
    activeStudents,
    inactiveStudents,
    newEnrollments,
    classDistribution,
    // Extra useful metrics
    totalClasses,
    totalMaterials,
    armDistribution,
    subjectDistribution,
    recentMaterials,
  ] = await Promise.all([
    // Total students
    queryWithRetry(() =>
      prisma.user.count({
        where: {
          schoolId: school.id,
          role: "STUDENT",
        },
      }),
    ),

    // Active students
    queryWithRetry(() =>
      prisma.user.count({
        where: {
          schoolId: school.id,
          role: "STUDENT",
          isActive: true,
        },
      }),
    ),

    // Inactive students
    queryWithRetry(() =>
      prisma.user.count({
        where: {
          schoolId: school.id,
          role: "STUDENT",
          isActive: false,
        },
      }),
    ),

    // New enrollments (last 30 days)
    queryWithRetry(() =>
      prisma.user.count({
        where: {
          schoolId: school.id,
          role: "STUDENT",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ),

    // Class distribution
    queryWithRetry(() =>
      prisma.class.findMany({
        where: {
          schoolId: school.id,
        },
        select: {
          name: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      }),
    ),

    // Total classes
    queryWithRetry(() =>
      prisma.class.count({
        where: {
          schoolId: school.id,
        },
      }),
    ),

    // Total uploaded materials
    queryWithRetry(() =>
      prisma.video.count({
        where: {
          schoolId: school.id,
        },
      }),
    ),

    // Arm distribution (students per arm)
    queryWithRetry(() =>
      prisma.arm.findMany({
        where: {
          class: {
            schoolId: school.id,
          },
        },
        select: {
          name: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      }),
    ),

    // Subject distribution (materials per subject)
    queryWithRetry(() =>
      prisma.subject.findMany({
        where: {
          class: {
            schoolId: school.id,
          },
        },
        select: {
          name: true,
          _count: {
            select: {
              materials: true,
            },
          },
        },
      }),
    ),

    // Recent materials (last 5)
    queryWithRetry(() =>
      prisma.video.findMany({
        where: {
          schoolId: school.id,
        },
        orderBy: {
          uploadedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          title: true,
          uploadedAt: true,
          class: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
    ),
  ]);

  // Format class distribution to { name, value }
  const formattedClassDistribution = classDistribution.map((cls) => ({
    name: cls.name,
    value: cls._count.students,
  }));

  // Group and sum arm distribution
  const armMap = new Map<string, number>();
  armDistribution.forEach((arm) => {
    const currentValue = armMap.get(arm.name) || 0;
    armMap.set(arm.name, currentValue + arm._count.students);
  });

  const formattedArmDistribution = Array.from(armMap.entries()).map(
    ([name, value]) => ({
      name,
      value,
    }),
  );

  // Format subject distribution
  const formattedSubjectDistribution = subjectDistribution.map((subject) => ({
    name: subject.name,
    value: subject._count.materials,
  }));

  res.status(200).json({
    success: true,
    stats: {
      totalStudents,
      activeStudents,
      inactiveStudents,
      newEnrollments,
      totalClasses,
      totalMaterials,
    },
    distributions: {
      classDistribution: formattedClassDistribution,
      armDistribution: formattedArmDistribution,
      subjectDistribution: formattedSubjectDistribution,
    },
    recentMaterials,
  });
};
