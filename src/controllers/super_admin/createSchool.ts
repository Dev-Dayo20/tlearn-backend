import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prismaClient";
import { queryWithRetry } from "../../utils/Utils";
import { generateToken } from "../../utils/Utils";
import { Role } from "@prisma/client";
import { createSchoolPayload, schoolIdParam } from "../../utils/types";

export const createSchoolWithAdmin = async (req: Request, res: Response) => {
  try {
    const {
      schoolName,
      subdomain,
      schoolEmail,
      address,
      logo,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body as createSchoolPayload;
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
            logo,
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
    const schools = await queryWithRetry(() =>
      prisma.school.findMany({
        include: {
          _count: {
            select: { users: true, classes: true, videos: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );
    res.status(200).json({ success: true, count: schools.length, schools });
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
