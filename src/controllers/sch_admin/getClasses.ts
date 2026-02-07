import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import { getClassesSchema } from "../../middlewares/zodSchema";
import { asyncHandler } from "../../utils/asyncHandler";

export const getClasses = asyncHandler(async (req: Request, res: Response) => {
  const validatedQuery = getClassesSchema.safeParse(req.query);

  if (!validatedQuery.success) {
    throw new AppError("Invalid query parameters", 400);
  }

  const { search, page, pageSize, isActive, sortBy, sortOrder } =
    validatedQuery.data;

  const skip = (page - 1) * pageSize;
  const conditions: any = { schoolId: req.school?.id };

  if (search) {
    const sanitizedSearch = search.replace(/[%_\\]/g, "\\$&");
    conditions.name = {
      contains: sanitizedSearch,
      mode: "insensitive",
    };
  }

  if (isActive !== undefined) {
    conditions.isActive = isActive === "true";
  }

  // Get total count
  const totalClasses = await queryWithRetry(() =>
    prisma.class.count({ where: conditions }),
  );

  const maxPage = Math.ceil(totalClasses / pageSize) || 1;
  if (page > maxPage && totalClasses > 0) {
    throw new AppError(
      `Page ${page} does not exist. Maximum page is ${maxPage}`,
    );
  }

  // Get paginated classes
  const classes = await queryWithRetry(() =>
    prisma.class.findMany({
      where: conditions,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            students: true,
            videos: true,
            arms: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalClasses / pageSize) || 1;

  return res.status(200).json({
    success: true,
    classes,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems: totalClasses,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
});

export const getClassDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id || typeof id !== "string") {
      throw new AppError("Invalid class ID", 400);
    }

    const classId = parseInt(id);
    if (isNaN(classId)) {
      throw new AppError("Invalid class ID format", 400);
    }

    const school = req.school;

    const classData = await queryWithRetry(() =>
      prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: school?.id,
        },
        include: {
          subjects: {
            include: {
              teacher: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          arms: true,
          students: {
            include: {
              arm: true,
            },
          },
          _count: {
            select: {
              students: true,
              subjects: true,
              arms: true,
              videos: true,
            },
          },
        },
      }),
    );

    if (!classData) {
      throw new AppError("Class not found", 404);
    }
    res.status(200).json({ success: true, classData });
  },
);
