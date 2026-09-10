import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { getStudentLessons as getStudentLessonsService } from "../../services/student.lessons.service";
import { GetStudentLessonsQuery } from "../../middlewares/zodSchema";

export const getStudentLessons = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AppError("Authentication required", 401);
    }

    if (user.role !== "STUDENT") {
      throw new AppError("Student access required", 403);
    }

    if (!user.schoolId) {
      throw new AppError("School context missing", 400);
    }

    // Query params are already validated and transformed by the Zod middleware
    const { page, limit, search, subject, sortBy, sortOrder } =
      req.query as unknown as GetStudentLessonsQuery;

    const result = await getStudentLessonsService({
      studentId: user.id,
      schoolId: user.schoolId,
      page,
      limit,
      search,
      subject,
      sortBy,
      sortOrder,
    });

    res.status(200).json(result);
  },
);
