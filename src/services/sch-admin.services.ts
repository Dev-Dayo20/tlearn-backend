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
  // 1️⃣ Get student details
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

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  // 2️⃣ Get total materials for student's class
  const totalMaterials = await queryWithRetry(() =>
    prisma.video.count({
      where: {
        classId: student?.class?.id,
        schoolId,
      },
    }),
  );

  // 3️⃣ Get completed materials count
  const completedCount = await queryWithRetry(() =>
    prisma.videoProgress.count({
      where: {
        studentId: student.id,
        isCompleted: true,
      },
    }),
  );

  // 4️⃣ Get materials with progress
  const classMaterials = await queryWithRetry(() =>
    prisma.video.findMany({
      where: {
        classId: student?.class?.id,
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
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    }),
  );

  return {
    student,
    stats: {
      totalMaterials,
      completedCount,
    },
    classMaterials,
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
