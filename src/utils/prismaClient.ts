import { PrismaClient } from "@prisma/client";

const glonbalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = glonbalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") glonbalForPrisma.prisma = prisma;
