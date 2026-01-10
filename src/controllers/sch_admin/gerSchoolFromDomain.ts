import { prisma } from "../../utils/prismaClient";
import { Request, Response } from "express";
import { queryWithRetry } from "../../utils/Utils";
import { AppError } from "../../utils/AppError";

export const getSchoolFromDomain = async (req: Request, res: Response) => {
  const { subdomain } = req.params;

  if (!subdomain || !/^[a-z]+$/.test(subdomain)) {
    throw new AppError("INvalid url", 400);
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
    throw new AppError("School not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "School fetched successfully",
    school,
  });
};
