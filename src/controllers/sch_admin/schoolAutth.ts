import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prismaClient";
import { SchoolUsersPayload } from "../../utils/types";
import { SchoolLoginSchema } from "../../middlewares/zodSchema";
import { queryWithRetry } from "../../utils/Utils";
import {
  generateSchoolUserToken,
  generateSchoolUserRefreshToken,
  verifyRefreshToken,
} from "../../utils/Utils";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

export const SchoolUsersLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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
        }),
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
        }),
      );

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.password) {
        throw new AppError("Password not set for this user.", 401);
      }

      const passwordMatch = await bcrypt.compare(data.password, user.password);
      if (!passwordMatch) {
        throw new AppError("Invalid credentials", 401);
      }

      const { password, ...userWithoutPassword } = user;
      user = userWithoutPassword;
    }

    if (!user.schoolId) {
      throw new AppError(
        "Internal Error: User missing school association",
        500,
      );
    }

    const payload: SchoolUsersPayload = {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    };

    const accessToken = generateSchoolUserToken(payload);
    const refreshToken = generateSchoolUserRefreshToken(payload);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite:
        process.env.NODE_ENV === "production"
          ? ("lax" as const)
          : ("none" as const),
      domain:
        process.env.NODE_ENV === "production" ? ".tlearn.africa" : ".localhost",
      path: "/",
    };

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 30 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      // accessToken: token,
      user,
    });
  },
);

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await queryWithRetry(() =>
      prisma.user.findFirst({
        where: {
          id: decoded.id,
          ...(decoded.schoolId && { schoolId: decoded.schoolId }),
          isActive: true,
        },
        select: {
          id: true,
          role: true,
          schoolId: true,
        },
      }),
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const payload: SchoolUsersPayload = {
      id: user.id,
      role: user.role,
    };

    if (user.schoolId) {
      payload.schoolId = user.schoolId;
    }

    // Generate new access token
    const newAccessToken = generateSchoolUserToken(payload);

    // Set new access token in cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite:
        process.env.NODE_ENV === "production"
          ? ("lax" as const)
          : ("none" as const),
      domain:
        process.env.NODE_ENV === "production" ? ".tlearn.africa" : ".localhost",
      path: "/",
      maxAge: 30 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      // accessToken: newAccessToken,
    });
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite:
      process.env.NODE_ENV === "production"
        ? ("lax" as const)
        : ("none" as const),
    domain:
      process.env.NODE_ENV === "production" ? ".tlearn.africa" : ".localhost",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite:
      process.env.NODE_ENV === "production"
        ? ("lax" as const)
        : ("none" as const),
    domain:
      process.env.NODE_ENV === "production" ? ".tlearn.africa" : ".localhost",
    path: "/",
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});
