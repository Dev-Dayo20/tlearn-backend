import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prismaClient";
import { generateSchoolUserToken, queryWithRetry } from "../../utils/Utils";
import { Role } from "@prisma/client";
import { createSchoolPayload } from "../../utils/types";
import { uploadToCloudinary } from "../../utils/uploadImage";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

export const createSchoolWithAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      schoolName,
      subdomain,
      schoolEmail,
      address,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body as createSchoolPayload;

    // Upload logo if provided
    let logoUrl: string | null = null;
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file);
    }

    if (
      !schoolName ||
      !subdomain ||
      !schoolEmail ||
      !adminName ||
      !adminEmail ||
      !adminPassword
    ) {
      throw new AppError("Missing required fields", 400);
    }

    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      throw new AppError("Invlaid domain format", 400);
    }

    const existingSchool = await queryWithRetry(() =>
      prisma.school.findUnique({ where: { subdomain } }),
    );
    if (existingSchool) {
      throw new AppError("Domain name already in use.", 400);
    }

    const existingAdmin = await queryWithRetry(() =>
      prisma.user.findUnique({ where: { email: adminEmail } }),
    );
    if (existingAdmin) {
      throw new AppError("Admin already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create school and admin within a transaction
    const result = await queryWithRetry(() =>
      prisma.$transaction(async (tx) => {
        const school = await tx.school.create({
          data: {
            name: schoolName,
            subdomain,
            email: schoolEmail,
            address,
            logo: logoUrl, // Save Cloudinary URL
            isActive: true,
          },
        });

        const schoolAdmin = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: Role.ADMIN,
            schoolId: school.id,
          },
        });
        return { school, schoolAdmin };
      }),
    );

    const token = generateSchoolUserToken({
      id: result.schoolAdmin.id,
      email: result.schoolAdmin.email ?? undefined,
      role: result.schoolAdmin.role,
      schoolId: result.school.id,
      subdomain: result.school.subdomain,
    });

    res.status(201).json({
      success: true,
      message: "School and admin created successfully.",
      school: {
        id: result.school.id,
        name: result.school.name,
        subdomain: result.school.subdomain,
        email: result.school.email,
        address: result.school.address,
        logo: result.school.logo,
      },
      admin: {
        id: result.schoolAdmin.id,
        name: result.schoolAdmin.name,
        email: result.schoolAdmin.email,
        token,
      },
    });
  },
);

export const getAllSchools = asyncHandler(
  async (req: Request, res: Response) => {
    const { search, status, page = "1", limit = "10" } = req.query;

    // Parse pagination params
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereConditions: any = {};

    if (search && typeof search === "string") {
      whereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subdomain: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status && status !== "all") {
      if (status === "active") {
        whereConditions.isActive = true;
      } else if (status === "inactive") {
        whereConditions.isActive = false;
      }
    }

    // Get total count for pagination
    const totalSchools = await queryWithRetry(() =>
      prisma.school.count({ where: whereConditions }),
    );

    const schools = await queryWithRetry(() =>
      prisma.school.findMany({
        where: whereConditions,
        include: {
          _count: {
            select: { users: true, classes: true, videos: true },
          },
          users: {
            where: { role: Role.ADMIN },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    );

    const totalPages = Math.ceil(totalSchools / pageSize);

    res.status(200).json({
      success: true,
      count: schools.length,
      schools,
      pagination: {
        currentPage: pageNumber,
        pageSize: pageSize,
        totalSchools: totalSchools,
        totalPages: totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  },
);

export const toggleSchoolStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { schoolId } = req.params;
    const { isActive } = req.body;

    if (!schoolId || isActive === undefined) {
      throw new AppError("Missing required fields", 400);
    }
    if (typeof isActive !== "boolean") {
      throw new AppError("Invalid request type", 400);
    }

    const schoolIdParse = parseInt(schoolId as string); // <-- Add 'as string'
    if (isNaN(schoolIdParse)) {
      throw new AppError("Invalid school format", 400);
    }
    const school = await queryWithRetry(() =>
      prisma.school.update({
        where: { id: schoolIdParse },
        data: { isActive },
      }),
    );
    res.status(200).json({
      success: true,
      message: `School ${isActive ? "activated" : "deactivated"} successfully`,
      school,
    });
  },
);

export const deleteSchool = asyncHandler(
  async (req: Request, res: Response) => {
    const { schoolId } = req.params;

    if (!schoolId) {
      throw new AppError("Missing required fields", 400);
    }

    const schoolIdParse = parseInt(schoolId as string); // <-- Add 'as string'
    if (isNaN(schoolIdParse)) {
      throw new AppError("Invalid school format", 400);
    }

    // Check if school exists
    const school = await queryWithRetry(() =>
      prisma.school.findUnique({
        where: { id: schoolIdParse },
        include: {
          _count: {
            select: { users: true, classes: true, videos: true },
          },
        },
      }),
    );

    if (!school) {
      throw new AppError("School not found", 400);
    }

    // Optional: Prevent deletion if school has data
    if (school._count.users > 0 || school._count.classes > 0) {
      throw new AppError(
        "Cannot delete school with existing users or classes. Deactivate instead.",
        400,
      );
    }

    // Delete school (cascades to users, classes, videos based on Prisma schema)
    await queryWithRetry(() =>
      prisma.school.delete({
        where: { id: schoolIdParse },
      }),
    );

    res.status(200).json({
      success: true,
      message: "School deleted successfully",
    });
  },
);
