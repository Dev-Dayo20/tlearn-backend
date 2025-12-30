import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { generateToken } from "../../utils/Utils";
import { Role } from "@prisma/client";
import { createSchoolPayload } from "../../utils/types";
import { uploadToCloudinary } from "../../utils/uploadImage";

export const createSchoolWithAdmin = async (req: Request, res: Response) => {
  try {
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
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      res.status(400).json({
        message:
          "Invalid subdomain format. Only lowercase letters, numbers, and hyphens are allowed.",
      });
      return;
    }

    const existingSchool = await queryWithRetry(() =>
      prisma.school.findUnique({ where: { subdomain } })
    );
    if (existingSchool) {
      res.status(409).json({ message: "Subdomain already in use." });
      return;
    }

    const existingAdmin = await queryWithRetry(() =>
      prisma.user.findUnique({ where: { email: adminEmail } })
    );
    if (existingAdmin) {
      res.status(409).json({ message: "Admin email already in use." });
      return;
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
      })
    );

    const token = generateToken({
      id: result.schoolAdmin.id,
      email: result.schoolAdmin.email,
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
  } catch (error) {
    console.error("Error creating school and admin:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAllSchools = async (req: Request, res: Response) => {
  try {
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
      prisma.school.count({ where: whereConditions })
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
      })
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
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const toggleSchoolStatus = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { isActive } = req.body;

    if (!schoolId || isActive === undefined) {
      res
        .status(400)
        .json({ message: "Missing required fields: schoolId and isActive" });
      return;
    }
    if (typeof isActive !== "boolean") {
      res.status(400).json({ message: "isActive must be a boolean" });
      return;
    }

    const schoolIdParse = parseInt(schoolId);
    if (isNaN(schoolIdParse)) {
      res.status(400).json({ message: "Invalid school ID format" });
      return;
    }

    const school = await queryWithRetry(() =>
      prisma.school.update({
        where: { id: schoolIdParse },
        data: { isActive },
      })
    );
    res.status(200).json({
      success: true,
      message: `School ${isActive ? "activated" : "deactivated"} successfully`,
      school,
    });
  } catch (error) {
    console.error(`Error updating school status: ${error}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    if (!schoolId) {
      res.status(400).json({
        success: false,
        message: "School ID is required",
      });
      return;
    }

    const schoolIdParse = parseInt(schoolId);
    if (isNaN(schoolIdParse)) {
      res.status(400).json({
        success: false,
        message: "Invalid school ID format",
      });
      return;
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
      })
    );

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    // Optional: Prevent deletion if school has data
    // if (school._count.users > 0 || school._count.classes > 0) {
    //   res.status(400).json({
    //     success: false,
    //     message:
    //       "Cannot delete school with existing users or classes. Deactivate instead.",
    //   });
    //   return;
    // }

    // Delete school (cascades to users, classes, videos based on Prisma schema)
    await queryWithRetry(() =>
      prisma.school.delete({
        where: { id: schoolIdParse },
      })
    );

    res.status(200).json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting school:", error);
    // handleError(error, res);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
