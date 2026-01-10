import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { isEmailValid } from "../../utils/Utils";
import { prisma } from "../../utils/prismaClient";
import { AUthPayload } from "../../utils/types";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";

const secretKey = process.env.SECRET_KEY;

const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const emailValid = isEmailValid(email);
  if (!emailValid) {
    throw new AppError("Invalid email format", 400);
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
    })
  );
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new AppError("Unauthorized access.", 401);
  }

  const passwordMatch = await bcrypt.compare(password, admin.password);
  if (!passwordMatch) {
    throw new AppError("Invalid credentials.", 401);
  }

  const payload: AUthPayload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  };

  const token = jwt.sign(payload, secretKey as string, {
    expiresIn: "30m",
  });

  res.status(200).json({
    success: true,
    message: "login successful",
    token,
    admin: payload,
    adminName: admin.name,
  });
};

export { loginSuperAdmin };
