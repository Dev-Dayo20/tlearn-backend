import { prisma } from "../utils/prismaClient";
import { queryWithRetry } from "../utils/Utils";
import { AppError } from "../utils/AppError";
import { validateExists, validateUniqueEmail } from "../lib/validators";
import bcrypt from "bcryptjs";

interface GetStudentAnalyticsArgs {
  schoolId: number;
  studentId: number;
}

interface UpdateTeacherArgs {
  schoolId: number;
  teacherId: number;
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  profilePicture?: string | null;
  password?: string;
}

export const getStudentForAnalytics = async ({
  schoolId,
  studentId,
}: GetStudentAnalyticsArgs) => {
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
        classId: true,
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

  if (!student || !student.classId) {
    throw new AppError("Student not found", 404);
  }

  const [totalMaterials, completedCount, classMaterials, progressTimelineData] =
    await Promise.all([
      // Total materials for class
      prisma.video.count({
        where: {
          classId: student.classId,
          schoolId,
        },
      }),

      // Completed count
      prisma.videoProgress.count({
        where: {
          studentId: student.id,
          isCompleted: true,
        },
      }),

      // Class materials with progress
      prisma.video.findMany({
        where: {
          classId: student.classId,
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
            take: 1,
          },
        },
        orderBy: {
          uploadedAt: "desc",
        },
      }),

      // Progress timeline (last 8 weeks in ONE query)
      prisma.videoProgress.findMany({
        where: {
          studentId: student.id,
          lastWatchedAt: {
            gte: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          progressPercent: true,
          isCompleted: true,
          lastWatchedAt: true,
        },
        orderBy: {
          lastWatchedAt: "asc",
        },
      }),
    ]);

  return {
    student,
    stats: {
      totalMaterials,
      completedCount,
      avgProgress: 0, // Calculate if needed
    },
    classMaterials,
    progressTimelineData,
  };
};

export const updateTeacherService = async ({
  schoolId,
  teacherId,
  name,
  email,
  phoneNumber,
  profilePicture,
  password,
}: UpdateTeacherArgs) => {
  if (email) {
    await validateUniqueEmail(email, teacherId.toString());
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  const updatedTeacher = await queryWithRetry(() =>
    prisma.user.update({
      where: { id: teacherId, schoolId: schoolId, role: "TEACHER" },
      data: {
        ...(name && { name: name.trim().toLowerCase() }),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        ...(profilePicture !== undefined && {
          profilePicture: profilePicture || null,
        }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
      },
    }),
  );

  return updatedTeacher;
};

export type UpdateStudentArgs = {
  studentId: number;
  schoolId: number;
  name?: string;
  email?: string | null;
  classId?: number;
  armId?: number | null;
  dateOfBirth?: string | null;
  profilePicture?: string | null;
};
export const updateStudentService = async ({
  studentId,
  schoolId,
  name,
  email,
  classId,
  armId,
  dateOfBirth,
  profilePicture,
}: UpdateStudentArgs) => {
  const student = await validateExists(
    () =>
      prisma.user.findFirst({
        where: { id: studentId, schoolId, role: "STUDENT" },
      }),
    "Student not found",
  );

  if (email) {
    await validateUniqueEmail(email, studentId.toString());
  }
  // 2. Check class belongs to school if classId is provided
  if (classId) {
    await validateExists(
      () => prisma.class.findFirst({ where: { id: classId, schoolId } }),
      "Class not found",
    );
  }

  // 3. Check arm belongs to class if armId is provided
  const targetClassId = classId ?? student.classId;
  if (armId && targetClassId != null) {
    await validateExists(
      () =>
        prisma.arm.findFirst({
          where: {
            id: armId,
            classId: targetClassId,
          },
        }),
      "Arm not found or does not belong to this class",
    );
  }

  const updatedStudent = await queryWithRetry(() =>
    prisma.user.update({
      where: { id: studentId },
      data: {
        ...(name && { name: name.trim().toLowerCase() }),
        ...(email !== undefined && { email: email || null }),
        ...(classId && { classId }),
        ...(armId !== undefined && { armId: armId || null }),
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        }),
        ...(profilePicture !== undefined && {
          profilePicture: profilePicture || null,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        classId: true,
        armId: true,
        dateOfBirth: true,
        profilePicture: true,
        schoolId: true,
        createdAt: true,
      },
    }),
  );

  return updatedStudent;
};

export const deleteStudentService = async ({
  studentId,
  schoolId,
}: {
  studentId: number;
  schoolId: number;
}) => {
  const student = await validateExists(
    () =>
      prisma.user.findFirst({
        where: { id: studentId, schoolId, role: "STUDENT", isActive: true },
      }),
    "Student not found",
  );

  // Soft delete - just mark as inactive
  const deletedStudent = await queryWithRetry(() =>
    prisma.user.update({
      where: { id: studentId },
      data: {
        isActive: false,
        // deletedAt: new Date(),
      },
    }),
  );

  return deletedStudent;
};

export type CreateSubjectArgs = {
  name: string;
  classId: number;
  teacherId: number | null;
  schoolId: number;
};

export const createSubjectService = async ({
  name,
  classId,
  teacherId,
  schoolId,
}: CreateSubjectArgs) => {
  await validateExists(
    () =>
      prisma.class.findFirst({
        where: { id: classId, schoolId },
      }),
    "Class not found",
  );

  if (teacherId) {
    await validateExists(
      () =>
        prisma.user.findFirst({
          where: { id: teacherId, schoolId, role: "TEACHER", isActive: true },
        }),
      "Teacher not found",
    );
  }

  const existingSubject = await queryWithRetry(() =>
    prisma.subject.findFirst({
      where: {
        name: name.trim().toLowerCase(),
        classId: classId,
      },
    }),
  );

  if (existingSubject) {
    throw new AppError("Subject already exists in this class", 409);
  }

  const subject = await queryWithRetry(() =>
    prisma.subject.create({
      data: {
        name: name.trim().toLowerCase(),
        classId: classId,
        teacherId: teacherId ? teacherId : null,
      },
      select: {
        id: true,
        name: true,
        classId: true,
        teacherId: true,
        createdAt: true,
        class: {
          select: {
            name: true,
          },
        },
        teacher: {
          select: {
            name: true,
          },
        },
      },
    }),
  );
  return subject;
};

export const getAllSubjectsForDropdown = async (schoolId: number) => {
  const subjects = await queryWithRetry(() =>
    prisma.subject.findMany({
      where: {
        class: {
          schoolId: schoolId,
        },
      },
      select: {
        id: true,
        name: true,
        classId: true,
        teacherId: true,
        createdAt: true,
        class: {
          select: {
            name: true,
          },
        },
        teacher: {
          select: {
            name: true,
          },
        },
      },
    }),
  );
  return subjects;
};

export type GetAllSubjectsPaginationArgs = {
  schoolId: number;
  page: number;
  limit: number;
  search?: string;
  classId?: number;
};

export const getAllSubjectsPagination = async ({
  schoolId,
  page = 1,
  limit = 10,
  search,
  classId,
}: GetAllSubjectsPaginationArgs) => {
  const skip = (page - 1) * limit;

  const whereConditions: any = {
    class: {
      schoolId: schoolId,
    },
    ...(classId && { classId }),
    ...(search && {
      name: { contains: search, mode: "insensitive" as const },
    }),
  };

  const [totalSubjects, subjects] = await Promise.all([
    queryWithRetry(() => prisma.subject.count({ where: whereConditions })),
    queryWithRetry(() =>
      prisma.subject.findMany({
        where: whereConditions,
        select: {
          id: true,
          name: true,
          classId: true,
          teacherId: true,
          createdAt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ),
  ]);

  const totalPages = Math.ceil(totalSubjects / limit);

  return {
    subjects,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalSubjects,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const updateSubjectService = async ({
  subjectId,
  schoolId,
  name,
  classId,
  teacherId,
}: {
  subjectId: number;
  schoolId: number;
  name?: string;
  classId?: number;
  teacherId?: number | null;
}) => {
  const subject = await validateExists(
    () =>
      prisma.subject.findFirst({
        where: { id: subjectId, class: { schoolId } },
      }),
    "Subject not found",
  );

  // ✅ Check for duplicate name if name is being updated
  const targetClassId = classId ?? subject.classId;
  if (name) {
    const existingSubject = await queryWithRetry(() =>
      prisma.subject.findFirst({
        where: {
          name: name.trim().toLowerCase(),
          classId: targetClassId,
          NOT: { id: subjectId },
        },
      }),
    );

    if (existingSubject) {
      throw new AppError(
        "Subject with this name already exists in this class",
        409,
      );
    }
  }

  if (classId) {
    await validateExists(
      () =>
        prisma.class.findFirst({
          where: { id: classId, schoolId },
        }),
      "Class not found",
    );
  }

  if (teacherId) {
    await validateExists(
      () =>
        prisma.user.findFirst({
          where: { id: teacherId, schoolId, role: "TEACHER", isActive: true },
        }),
      "Teacher not found",
    );
  }

  const updatedSubject = await queryWithRetry(() =>
    prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(name && { name: name.trim().toLowerCase() }),
        ...(classId && { classId }),
        ...(teacherId !== undefined && { teacherId }),
      },
      select: {
        id: true,
        name: true,
        classId: true,
        teacherId: true,
        createdAt: true,
        class: {
          select: {
            name: true,
          },
        },
        teacher: {
          select: {
            name: true,
          },
        },
      },
    }),
  );

  return updatedSubject;
};

export const assignTeacherToClassService = async ({
  teacherId,
  schoolId,
  subjectId,
}: {
  teacherId: number;
  schoolId: number;
  subjectId: number;
}) => {
  await validateExists(
    () =>
      prisma.user.findFirst({
        where: { id: teacherId, schoolId, role: "TEACHER", isActive: true },
      }),
    "Teacher not found",
  );

  const subject = await validateExists(
    () =>
      prisma.subject.findFirst({
        where: { id: subjectId, class: { schoolId } },
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
        },
      }),
    "Subject not found",
  );
  if (subject.teacherId) {
    throw new AppError(
      `This subject is already assigned to ${subject?.teacher?.name || "another teacher"}`,
      400,
    );
  }

  const updatedTeacher = await queryWithRetry(() =>
    prisma.subject.update({
      where: { id: subjectId },
      data: {
        teacherId: teacherId,
      },
      select: {
        id: true,
        name: true,
        classId: true,
        teacherId: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  );

  return updatedTeacher;
};

export const removeTeacherFromSubjectService = async ({
  teacherId,
  schoolId,
  subjectId,
}: {
  teacherId: number;
  schoolId: number;
  subjectId: number;
}) => {
  await validateExists(
    () =>
      prisma.user.findFirst({
        where: { id: teacherId, schoolId, role: "TEACHER", isActive: true },
      }),
    "Teacher not found",
  );

  const subject = await validateExists(
    () =>
      prisma.subject.findFirst({
        where: {
          id: subjectId,
          class: { schoolId },
          teacherId: teacherId, // Must be assigned to this teacher
        },
        select: {
          id: true,
          name: true,
          teacherId: true,
          teacher: {
            select: { name: true },
          },
        },
      }),
    "Subject not found or not assigned to this teacher",
  );

  // Remove the teacher by setting teacherId to null
  const updatedSubject = await queryWithRetry(() =>
    prisma.subject.update({
      where: { id: subjectId },
      data: {
        teacherId: null,
      },
      select: {
        id: true,
        name: true,
        classId: true,
        teacherId: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  );

  return updatedSubject;
};

export const getTeacherByIdService = async ({
  teacherId,
  schoolId,
}: {
  teacherId: number;
  schoolId: number;
}) => {
  const teacher = await validateExists(
    () =>
      prisma.user.findFirst({
        where: {
          id: teacherId,
          schoolId,
          role: "TEACHER",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
          role: true,
          isActive: true,
          createdAt: true,
          // Get all subjects this teacher teaches
          teachingSubjects: {
            select: {
              id: true,
              name: true,
              classId: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    "Teacher not found",
  );

  return teacher;
};
