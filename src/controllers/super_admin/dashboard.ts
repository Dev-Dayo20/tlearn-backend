import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { getTimeAgo } from "../../utils/Utils";

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const [
      totalSchools,
      activeSchools,
      totalStudents,
      totalAdmins,
      totalVideos,
      activeSubscriptions,
      recentSchools,
    ] = await Promise.all([
      queryWithRetry(() => prisma.school.count()),
      queryWithRetry(() => prisma.school.count({ where: { isActive: true } })),
      queryWithRetry(() => prisma.user.count({ where: { role: "STUDENT" } })),
      queryWithRetry(() => prisma.user.count({ where: { role: "ADMIN" } })),
      queryWithRetry(() => prisma.video.count()),
      queryWithRetry(() =>
        prisma.subscription.count({ where: { status: "ACTIVE" } })
      ),
      queryWithRetry(() =>
        prisma.school.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        })
      ),
    ]);

    const growthRate =
      totalSchools > 0
        ? ((recentSchools / totalSchools) * 100).toFixed(1)
        : "0.0";

    res.status(200).json({
      success: true,
      metrics: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        totalStudents,
        totalAdmins,
        totalVideos,
        activeSubscriptions,
        growthRate: `${growthRate}%`,
        recentSchools, // Schools added in last 30 days
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getChartData = async (req: Request, res: Response) => {
  try {
    // Get data for last 6 months
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const studentCount = await queryWithRetry(() =>
        prisma.user.count({
          where: {
            role: "STUDENT",
            createdAt: {
              gte: date,
              lt: nextMonth,
            },
          },
        })
      );

      months.push({
        month: date.toLocaleString("en-US", { month: "short" }),
        users: studentCount,
      });
    }

    res.status(200).json({
      success: true,
      chartData: months,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    // Get 10 most recent schools
    const recentSchools = await queryWithRetry(() =>
      prisma.school.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: { users: true },
          },
        },
      })
    );

    // Format activities
    const activities = recentSchools.map((school) => ({
      id: school.id,
      schoolName: school.name,
      action: `Added ${school._count.users} users`,
      timestamp: school.createdAt,
      timeAgo: getTimeAgo(school.createdAt),
    }));

    res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
