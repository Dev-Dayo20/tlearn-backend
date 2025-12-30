import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      isActive: true,
    },
  });

  console.log(`Updated ${result.count} users`);
}

main()
  .catch((err) => {
    console.error("Error running script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
