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
      schoolId: null,
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
