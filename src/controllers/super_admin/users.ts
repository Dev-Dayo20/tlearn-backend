import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

export const getUsersMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    const [totalUsers, totalAdmins, totalStudents, recentUsers] =
      await Promise.all([
        queryWithRetry(() => prisma.user.count()),
        queryWithRetry(() => prisma.user.count({ where: { role: "ADMIN" } })),
        queryWithRetry(() => prisma.user.count({ where: { role: "STUDENT" } })),
        queryWithRetry(() =>
          prisma.user.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
        ),
      ]);
    const growthRate =
      totalUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(1) : "0.0";

    res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        totalAdmins,
        totalStudents,
        growthRate: `${growthRate}%`,
        recentUsers, // Users added in last 30 days
      },
    });
  },
);

export const getAllusers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, page = "1", pageSize = "10" } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limit = parseInt(pageSize as string, 10);
  const skip = (pageNumber - 1) * limit;

  const whereConditions: any = {};

  if (search && typeof search === "string") {
    whereConditions.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role && typeof role === "string" && role !== "all") {
    const upperRole = role.toUpperCase();

    if (!["ADMIN", "STUDENT", "TEACHER"].includes(upperRole)) {
      throw new AppError("Invalid role filter", 400);
    }

    whereConditions.role = upperRole;
  }

  // Exclude SUPER_ADMIN from results (they shouldn't appear in user list)
  whereConditions.role = {
    not: "SUPER_ADMIN",
  };

  // If role filter is applied, combine with NOT SUPER_ADMIN
  if (role && typeof role === "string" && role !== "all") {
    const upperRole = role.toUpperCase();

    if (!["ADMIN", "STUDENT", "TEACHER"].includes(upperRole)) {
      throw new AppError("Invalid role filter", 400);
    }

    whereConditions.role = upperRole; // This overrides the 'not' condition
  } else {
    // No role filter: exclude SUPER_ADMIN
    whereConditions.role = { not: "SUPER_ADMIN" };
  }

  const totalUsers = await queryWithRetry(() =>
    prisma.user.count({ where: whereConditions }),
  );

  // Get paginated users with school info
  const users = await queryWithRetry(() =>
    prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        classId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        school: {
          select: { id: true, name: true, subdomain: true },
        },
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  );

  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      currentPage: pageNumber,
      pageSize: limit,
      totalUsers: totalUsers,
      totalPages: totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    },
  });
});

export const userStatus = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (!userId || isActive === undefined) {
    throw new AppError("Missing required fields", 400);
  }
  if (typeof isActive !== "boolean") {
    throw new AppError("Invalid type", 400);
  }

  const userIdParse = parseInt(userId as string); // <-- Add 'as string'
  if (isNaN(userIdParse)) {
    throw new AppError("Invalid user format", 400);
  }

  const user = await queryWithRetry(() =>
    prisma.user.update({
      where: { id: userIdParse },
      data: { isActive },
    }),
  );

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "deactivated"} successfuly`,
  });
});
