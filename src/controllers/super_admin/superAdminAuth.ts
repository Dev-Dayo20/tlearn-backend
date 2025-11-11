import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { isEmailValid } from "../../utils/Utils";
import { prisma } from "../../utils/prismaClient";
import { AUthPayload } from "../../utils/types";
import { queryWithRetry } from "../../utils/Utils";

const secretKey = process.env.SECRET_KEY;

const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const emailValid = isEmailValid(email);
    if (!emailValid) {
      res.status(400).json({ success: false, message: "Invalid email format" });
      return;
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
      res.status(401).json({ message: "Unauthorized access." });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
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
  } catch (error) {
    console.error("Error during super admin login:", error);
    res.status(500).json({ message: "Internal server error." });
    return;
  }
};

export { loginSuperAdmin };
