import { prisma } from "../../utils/prismaClient";
import { Request, Response } from "express";
import { queryWithRetry } from "../../utils/Utils";

export const getSchoolFromDomain = async (req: Request, res: Response) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain || !/^[a-z]+$/.test(subdomain)) {
      res.status(400).json({ success: false, message: "Invalid url" });
      return;
    }

    const school = await queryWithRetry(() =>
      prisma.school.findUnique({
        where: { subdomain: subdomain },
        select: {
          id: true,
          name: true,
          subdomain: true,
          logo: true,
        },
      })
    );
    if (!school) {
      res.status(404).json({ success: false, message: "School not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "School fetched successfully",
      school,
    });
  } catch (error) {
    console.error("Error fetching school from domain:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
    return;
  }
};
