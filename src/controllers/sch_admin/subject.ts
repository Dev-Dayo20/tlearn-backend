import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createSubjectService,
  getAllSubjectsForDropdown,
  getAllSubjectsPagination,
  updateSubjectService,
} from "../../services/sch-admin.services";

export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("Unauthorized Access.", 401);
    }

    const { name, classId, teacherId } = req.body;
    const subject = await createSubjectService({
      name,
      classId,
      teacherId,
      schoolId: school.id,
    });
    res.status(201).json({
      status: "success",
      data: subject,
    });
  },
);

export const getAllSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("Unauthorized Access.", 401);
    }

    const subjects = await getAllSubjectsForDropdown(school.id);
    res.status(200).json({
      status: "success",
      data: subjects,
    });
  },
);

export const getAllSubjectsForPagination = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("Unauthorized Access.", 401);
    }

    // TypeScript doesn't know validation happened, but runtime data is correct
    const { page = 1, limit = 10, search, classId } = req.query;

    const result = await getAllSubjectsPagination({
      schoolId: school.id,
      page: page as number,
      limit: limit as number,
      search: search as string | undefined,
      classId: classId as number | undefined,
    });

    res.status(200).json({
      success: true,
      message: "Subjects retrieved successfully",
      data: result.subjects,
      pagination: result.pagination,
    });
  },
);

export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("Unauthorized Access.", 401);
    }

    const subjectId = parseInt(req.params.id as string);

    const { name, classId, teacherId } = req.body;
    const subject = await updateSubjectService({
      subjectId,
      schoolId: school.id,
      name,
      classId,
      teacherId,
    });
    res.status(200).json({
      status: "success",
      data: subject,
    });
  },
);
