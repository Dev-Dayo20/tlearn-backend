import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { isEmailValid } from "../../utils/Utils";
import { prisma } from "../../utils/prismaClient";
import { SchoolUsersPayload } from "../../utils/types";
import { SchoolLoginSchema } from "../../middlewares/zodSchema";
import { queryWithRetry } from "../../utils/Utils";
import { generateSchoolUserToken } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";

export const SchoolUsersLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { role } = req.body;
  const school = req.school;

  if (!role) {
    throw new AppError("Missing required fields", 401);
  }

  if (!school) {
    throw new AppError("Unauthorized access", 401);
  }

  if (!["ADMIN", "STUDENT", "TEACHER"].includes(role)) {
    throw new AppError("Invalid role", 401);
  }

  type Role = "ADMIN" | "STUDENT" | "TEACHER";

  const schema = SchoolLoginSchema[role as Role];
  const validatedData = schema.safeParse(req.body);

  if (!validatedData.success) {
    // if (process.env.NODE_ENV === "development") {
    //   res.status(400).json({
    //     success: false,
    //     message: "Validation failed",
    //     erorrs: validatedData.error.flatten().fieldErrors,
    //   });
    //   return;
    // }
    throw new AppError("Validation failed", 400);
  }

  const data = validatedData.data;
  let user;

  if (data.schoolId !== school.id) {
    throw new AppError("Invalid school access", 401);
  }

  if (data.role === "STUDENT") {
    user = await queryWithRetry(() =>
      prisma.user.findFirst({
        where: {
          studentId: data.studentId,
          role: "STUDENT",
          schoolId: school?.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          studentId: true,
          schoolId: true,
          classId: true,
          arm: true,
          isActive: true,
        },
      })
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }
  } else {
    user = await queryWithRetry(() =>
      prisma.user.findFirst({
        where: {
          email: data.email,
          role: data.role,
          schoolId: school?.id,
          isActive: true,
        },
      })
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const { password, ...userWithoutPassword } = user;
    user = userWithoutPassword;
  }

  const payload: SchoolUsersPayload = {
    id: user.id,
    role: user.role,
  };

  const token = generateSchoolUserToken(payload);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    user,
  });
};
