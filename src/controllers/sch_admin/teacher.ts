import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import {
  createTeacherSchema,
  updateTeacherSchema,
} from "../../middlewares/zodSchema";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  assignTeacherToClassService,
  removeTeacherFromSubjectService,
  updateTeacherService,
  getTeacherByIdService,
} from "../../services/sch-admin.services";
import { paginationQuerySchema } from "../../middlewares/zodSchema";

export const createTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const validateData = createTeacherSchema.safeParse(req.body);

    if (!validateData.success) {
      throw new AppError("Invalid fields", 400);
    }
    // if (!validateData.success) {
    //   throw new AppError(
    //     (validateData as z.SafeParseError<typeof createTeacherSchema>).error
    //       .errors[0].message,
    //     400,
    //   );
    // }
    const { name, email, password } = validateData.data;
    const school = req.school;

    if (!school) {
      throw new AppError("School not found", 400);
    }

    const existingEmail = await queryWithRetry(() =>
      prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      }),
    );

    if (existingEmail) {
      throw new AppError("Email already in use", 400);
    }

    const existingTeacher = await queryWithRetry(() =>
      prisma.user.findFirst({
        where: {
          name: { equals: name.trim().toLowerCase(), mode: "insensitive" },
          schoolId: req.school?.id,
          role: "TEACHER",
        },
      }),
    );

    if (existingTeacher) {
      throw new AppError(
        "Teacher with this name already exists in your school",
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = await queryWithRetry(() =>
      prisma.user.create({
        data: {
          name: name.trim().toLowerCase(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: "TEACHER",
          schoolId: req.school?.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          schoolId: true,
          isActive: true,
          createdAt: true,
        },
      }),
    );

    return res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      newTeacher,
    });
  },
);

export const getTeachers = asyncHandler(async (req: Request, res: Response) => {
  const school = req.school;

  if (!school) {
    throw new AppError("School not found", 400);
  }

  const validatedQuery = paginationQuerySchema.safeParse(req.query);
  if (!validatedQuery.success) {
    throw new AppError("Invalid query parameters", 400);
  }

  const { search, page, limit } = validatedQuery.data;

  const pageNumber = Math.max(1, page);
  const pageSize = Math.max(1, limit);
  const skip = (pageNumber - 1) * pageSize;

  const whereConditions: any = {
    schoolId: school.id,
    role: "TEACHER",
    isActive: true,
  };

  if (search && typeof search === "string") {
    whereConditions.OR = [
      { name: { contains: search.toLowerCase(), mode: "insensitive" } },
      { email: { contains: search.toLowerCase(), mode: "insensitive" } },
    ];
  }

  const [totalTeachers, teachers] = await Promise.all([
    queryWithRetry(() => prisma.user.count({ where: whereConditions })),
    queryWithRetry(() =>
      prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          name: "asc",
        },
        skip,
        take: pageSize,
      }),
    ),
  ]);

  const totalPages = Math.ceil(totalTeachers / pageSize);

  return res.status(200).json({
    success: true,
    teachers,
    pagination: {
      currentPage: pageNumber,
      pageSize,
      totalTeachers,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    },
  });
});

export const updateTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("School not found", 400);
    }

    const teacherId = parseInt(req.params.id as string);
    const schoolId = school.id;

    const validatedData = updateTeacherSchema.safeParse(req.body);
    if (!validatedData.success) {
      throw new AppError("Invalid input", 400);
    }

    const { name, email, phoneNumber, profilePicture, password } =
      validatedData.data;

    const updatedTeacher = await updateTeacherService({
      teacherId,
      schoolId,
      name,
      email,
      phoneNumber,
      profilePicture,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      updatedTeacher,
    });
  },
);

export const assignTeacherToClass = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("School not found", 400);
    }

    const teacherId = parseInt(req.params.id as string);
    const schoolId = school.id;

    const { subjectId } = req.body;

    const updatedTeacher = await assignTeacherToClassService({
      teacherId,
      schoolId,
      subjectId,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher assigned to class successfully",
      updatedTeacher,
    });
  },
);

export const removeTeacherFromSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("School not found", 400);
    }

    const teacherId = parseInt(req.params.id as string);
    const { subjectId } = req.body;

    const updatedSubject = await removeTeacherFromSubjectService({
      teacherId,
      schoolId: school.id,
      subjectId,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher removed from subject successfully",
      data: updatedSubject,
    });
  },
);

export const getTeacherById = asyncHandler(
  async (req: Request, res: Response) => {
    const school = req.school;
    if (!school) {
      throw new AppError("Unauthorized Access.", 401);
    }

    const teacherId = parseInt(req.params.id as string);

    const teacher = await getTeacherByIdService({
      teacherId,
      schoolId: school.id,
    });

    res.status(200).json({
      success: true,
      data: teacher,
    });
  },
);
