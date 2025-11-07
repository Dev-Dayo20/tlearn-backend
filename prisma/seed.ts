import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const superAdminEmail =
  process.env.SUPER_ADMIN_EMAIL || "admintlearn@tlearn.com";
const superAdminPassword =
  process.env.SUPER_ADMIN_PASSWORD || "tlearnadmin@2000";
const superAdminName = process.env.SUPER_ADMIN_NAME || "Tlearn Super Admin";

export async function main() {
  console.log("Starting database seeding...");

  //Create Sample School
  const sampleSchool = await prisma.school.upsert({
    where: { subdomain: "Tlearn-sample" },
    update: {},
    create: {
      name: "Tlearn Sample School",
      subdomain: "Tlearn-sample",
      email: "sampleschool@gmail.com",
    },
  });

  const sampleSchId = sampleSchool.id;
  const salt: number = 10;
  const hashedPassword = await bcrypt.hash(superAdminPassword, salt);

  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: superAdminName,
      email: superAdminEmail,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      schoolId: sampleSchId,
    },
  });

  console.log(
    `✅ Super Admin created/updated: ${superAdminUser.email} ${superAdminUser.id}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Database seeding completed.");
  });
