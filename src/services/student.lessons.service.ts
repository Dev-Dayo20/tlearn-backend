import { prisma } from "../utils/prismaClient";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";

interface GetStudentLessonsArgs {
  studentId: number;
  schoolId: number;
  page: number;
  limit: number;
  search?: string;
  subject?: string;
  sortBy: "date" | "title" | "progress";
  sortOrder: "asc" | "desc";
}

/**
 * Format duration from seconds to a human-readable string.
 * e.g. 930 → "15 mins", 3661 → "1 hr 1 min"
 */
function formatDuration(seconds: number | null): string | undefined {
  if (seconds === null || seconds === undefined) return undefined;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins > 1 ? "s" : ""}`;
  }
  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  }
  if (mins > 0) {
    return `${mins} min${mins > 1 ? "s" : ""}`;
  }
  return `${seconds} sec`;
}

//student lessons
export const getStudentLessons = async ({
  studentId,
  schoolId,
  page,
  limit,
  search,
  subject,
  sortBy,
  sortOrder,
}: GetStudentLessonsArgs) => {
  // 1. Fetch the student to get their classId
  const student = await queryWithRetry(() =>
    prisma.user.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
        role: "STUDENT",
        isActive: true,
      },
      select: {
        id: true,
        classId: true,
      },
    }),
  );

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  if (!student.classId) {
    throw new AppError("Student is not assigned to a class", 400);
  }

  // 2. Build where conditions — scoped to student's class + school
  const whereConditions: any = {
    classId: student.classId,
    schoolId: schoolId,
  };

  // Search filter
  if (search) {
    whereConditions.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Subject name filter
  if (subject) {
    whereConditions.subject = {
      name: { equals: subject, mode: "insensitive" },
    };
  }

  // 3. Build orderBy based on sortBy parameter
  let orderBy: any;
  if (sortBy === "date") {
    orderBy = { uploadedAt: sortOrder };
  } else if (sortBy === "title") {
    orderBy = { title: sortOrder };
  } else {
    // "progress" sorting — we handle this in-memory after fetching
    // because progress is on a related table
    orderBy = { uploadedAt: "desc" };
  }

  const skip = (page - 1) * limit;

  // 4. Execute main query + counts in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [videos, totalLessons, weeklyCount, inProgressCount, completedCount] =
    await Promise.all([
      // Main lessons query
      queryWithRetry(() =>
        prisma.video.findMany({
          where: whereConditions,
          select: {
            id: true,
            title: true,
            description: true,
            url: true,
            duration: true,
            classId: true,
            subjectId: true,
            uploadedAt: true,
            subject: {
              select: {
                name: true,
                teacher: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            videoProgresses: {
              where: {
                studentId: student.id,
              },
              select: {
                progressPercent: true,
                isCompleted: true,
              },
              take: 1,
            },
            _count: {
              select: {
                videoProgresses: true,
              },
            },
          },
          orderBy,
          skip: sortBy === "progress" ? undefined : skip,
          take: sortBy === "progress" ? undefined : limit,
        }),
      ),

      // Total lessons count (with same filters)
      queryWithRetry(() => prisma.video.count({ where: whereConditions })),

      // Weekly count (uploaded in last 7 days)
      queryWithRetry(() =>
        prisma.video.count({
          where: {
            ...whereConditions,
            uploadedAt: { gte: sevenDaysAgo },
          },
        }),
      ),

      // In-progress count (student has progress > 0 but not completed)
      queryWithRetry(() =>
        prisma.videoProgress.count({
          where: {
            studentId: student.id,
            progressPercent: { gt: 0 },
            isCompleted: false,
            video: {
              classId: student.classId!,
              schoolId: schoolId,
            },
          },
        }),
      ),

      // Completed count
      queryWithRetry(() =>
        prisma.videoProgress.count({
          where: {
            studentId: student.id,
            isCompleted: true,
            video: {
              classId: student.classId!,
              schoolId: schoolId,
            },
          },
        }),
      ),
    ]);

  // 5. Shape the lessons to match the frontend contract
  let lessons = videos.map((video) => {
    const progress = video.videoProgresses[0]?.progressPercent ?? 0;
    const isNew = video.uploadedAt >= sevenDaysAgo;

    return {
      id: video.id,
      title: video.title,
      subject: video.subject?.name || "General",
      description: video.description || "",
      type: "Video" as const,
      duration: formatDuration(video.duration),
      videoUrl: video.url,
      date: video.uploadedAt.toISOString(),
      progress,
      isNew,
      instructorName: video.subject?.teacher?.name || undefined,
      viewsCount: video._count.videoProgresses,
      classId: video.classId,
      subjectId: video.subjectId || undefined,
    };
  });

  // 6. Handle "progress" sorting in-memory (since it's on a related table)
  if (sortBy === "progress") {
    lessons.sort((a, b) => {
      const diff = a.progress - b.progress;
      return sortOrder === "asc" ? diff : -diff;
    });

    // Apply pagination after sorting
    lessons = lessons.slice(skip, skip + limit);
  }

  // 7. Build pagination metadata
  const totalPages = Math.ceil(totalLessons / limit);
  const pagination = {
    currentPage: page,
    pageSize: limit,
    totalLessons,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  // 8. Build stats
  const stats = {
    totalLessons,
    inProgressCount,
    completedCount,
    weeklyCount,
  };

  return {
    success: true,
    message: "Lessons fetched successfully",
    lessons,
    pagination,
    stats,
  };
};
