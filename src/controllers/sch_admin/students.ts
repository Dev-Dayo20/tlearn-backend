import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import { createStudentSchema } from "../../middlewares/zodSchema";
import { uploadToCloudinary } from "../../utils/uploadImage";

const makePrefix = (value: string, length = 3): string => {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, length);
};

export const createStudents = async (req: Request, res: Response) => {
  const validation = createStudentSchema.safeParse(req.body);

  if (!validation.success) {
    throw new AppError("Invalid input", 400);
  }

  const { name, email, classId, armId, dateOfBirth, profilePicture } =
    validation.data;

  // Upload profile picture if provided
  let profilePictureUrl: string | null = null;
  if (req.file) {
    profilePictureUrl = await uploadToCloudinary(req.file);
  } else {
    profilePictureUrl = profilePicture || null;
  }

  const school = req.school;

  const classExists = await queryWithRetry(() =>
    prisma.class.findFirst({
      where: { id: classId, schoolId: school?.id },
    }),
  );

  if (!classExists) {
    throw new AppError("Class not found", 404);
  }

  // Check arm belongs to class (if provided)
  if (armId) {
    const armExists = await queryWithRetry(() =>
      prisma.arm.findFirst({
        where: { id: armId, classId },
      }),
    );

    if (!armExists) {
      throw new AppError("Arm not found in this class", 404);
    }
  }

  // Check email unique (if provided)
  if (email) {
    const emailExists = await queryWithRetry(() =>
      prisma.user.findUnique({ where: { email } }),
    );

    if (emailExists) {
      throw new AppError("Email already in use", 409);
    }
  }

  // Generate unique student ID
  const year = new Date().getFullYear();
  const count = await prisma.user.count({
    where: {
      role: "STUDENT",
      schoolId: school?.id,
    },
  });
  const studentId = `STU-${year}-${String(count + 1).padStart(5, "0")}`;

  const student = await prisma.$transaction(async (tx) => {
    const updateSchool = await tx.school.update({
      where: { id: school?.id },
      data: {
        studentCounter: { increment: 1 },
      },
      select: { studentCounter: true, name: true },
    });

    const schoolCode = makePrefix(updateSchool.name, 3);
    const classCode = makePrefix(classExists.name, 3);
    const serial = String(updateSchool.studentCounter).padStart(5, "0");

    const studentId = `${schoolCode}/${classCode}/${serial}`;

    const newStudent = await tx.user.create({
      data: {
        name: name.trim().toLowerCase(),
        email: email || null,
        studentId,
        role: "STUDENT",
        schoolId: school?.id,
        classId,
        armId: armId || null,
        profilePicture: profilePictureUrl,
        dateOfBirth: dateOfBirth || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        profilePicture: true,
        class: { select: { id: true, name: true } },
        arm: { select: { id: true, name: true } },
      },
    });
    return newStudent;
  });

  res.status(201).json({
    success: true,
    message: "Student created successfully",
    student,
  });
};

export const getStudents = async (req: Request, res: Response) => {
  const { classId, armId, search, page = "1", limit = "10" } = req.query;

  const school = req.school;
  if (!school) {
    throw new AppError("School not found", 404);
  }

  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;

  const whereConditions: any = {
    schoolId: school.id,
    role: "STUDENT",
  };

  if (classId) {
    whereConditions.classId = parseInt(classId as string);
  }

  if (armId) {
    whereConditions.armId = parseInt(armId as string);
  }

  if (search && typeof search === "string") {
    whereConditions.OR = [
      { name: { contains: search.toLowerCase(), mode: "insensitive" } },
      { email: { contains: search.toLowerCase(), mode: "insensitive" } },
      { studentId: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalStudents = await queryWithRetry(() =>
    prisma.user.count({ where: whereConditions }),
  );

  const students = await queryWithRetry(() =>
    prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        profilePicture: true,
        dateOfBirth: true,
        isActive: true,
        class: { select: { id: true, name: true } },
        arm: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  );

  const totalPages = Math.ceil(totalStudents / pageSize);

  res.status(200).json({
    success: true,
    message: "Students retrieved successfully",
    students,
    pagination: {
      currentPage: pageNumber,
      pageSize: pageSize,
      totalStudents: totalStudents,
      totalPages: totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    },
  });
};
