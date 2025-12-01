import { Request, Response } from "express";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";

export const getAllSchools = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
