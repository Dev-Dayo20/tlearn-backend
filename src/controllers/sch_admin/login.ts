import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  isEmailValid,
  queryWithRetry,
  generateSchoolUserToken,
  generateSchoolUserRefreshToken,
  getCookieOptions,
} from "../../utils/Utils";
import { prisma } from "../../utils/prismaClient";
import { SchoolUsersPayload } from "../../utils/types";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

const superAdminLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError("Email and password are required.", 400);
    }

    const emailValid = isEmailValid(email);
    if (!emailValid) {
      throw new AppError("Invalid email format.", 400);
    }

    const admin = await queryWithRetry(() =>
      prisma.user.findUnique({
        where: { email: email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          name: true,
        },
      }),
    );
    if (!admin || admin.role !== "SUPER_ADMIN") {
      throw new AppError("Unauthorized access.", 401);
    }

    if (!admin.password) {
      throw new AppError("Password not set for this user.", 401);
    }

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password as string,
    );

    if (!passwordMatch) {
      throw new AppError("Invalid credentials.", 401);
    }

    const payload: SchoolUsersPayload = {
      id: admin.id,
      email: admin.email ?? undefined,
      role: admin.role,
    };

    const accessToken = generateSchoolUserToken(payload);
    const refreshToken = generateSchoolUserRefreshToken(payload);

    const cookieOptions = getCookieOptions();

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
      admin: payload,
      user: {
        ...payload,
        name: admin.name,
      },
      adminName: admin.name,
    });
  },
);

const superAdminLogout = asyncHandler(async (req: Request, res: Response) => {
  const cookieOptions = getCookieOptions();

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

export { superAdminLogin, superAdminLogout };
