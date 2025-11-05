import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

const loginSuperAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  try {
    // const superAdmin =
  } catch (error) {
    console.error("Error during super admin login:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
