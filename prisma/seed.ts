import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const superAdminEmail =
  process.env.SUPER_ADMIN_EMAIL || "admintlearn@tlearn.com";
const superAdminPassword =
  process.env.SUPER_ADMIN_PASSWORD || "tlearnadmin@2000";
const superAdminName = process.env.SUPER_ADMIN_NAME || "Tlearn Super Admin";

// ─────────────────────────────────────────────────────────────────────────────
// Subject definitions per class
// Grade One is excluded — it already has subjects seeded.
// ─────────────────────────────────────────────────────────────────────────────

/** Subjects shared by Grade Two → Grade Five */
const primarySubjects = [
  "English Studies",
  "Mathematics",
  "Nigerian Language",
  "Basic Science",
  "Physical & Health Education",
  "Christian Religious Studies (CRS)",
  "Islamic Studies (IS)",
  "Nigerian History",
  "Social and Citizenship Studies",
  "Cultural & Creative Arts (CCA)",
  "Arabic Language",
];

/** Subjects shared by JSS One → JSS Three */
const jssSubjects = [
  "English Studies",
  "Mathematics",
  "Basic Science",
  "Technology",
  "Physical & Health Education",
  "Nigerian History",
  "Social & Citizenship Studies",
  "Cultural & Creative Arts (CCA)",
  "Business Studies",
  "Pre-Vocational Studies",
  "Nigerian Language",
  "Religious Studies",
  "French Language",
  "Arabic Language",
];

/** Subjects shared by SS One → SS Three */
const ssSubjects = [
  "English Language",
  "Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "Agricultural Science",
  "Computer Science",
  "Further Mathematics",
  "Economics",
  "Government",
  "Geography",
  "History",
  "Literature-in-English",
  "Christian Religious Studies",
  "Islamic Studies",
  "Accounting",
  "Commerce",
  "Marketing",
  "Visual Arts",
  "Nigerian Languages",
  "French",
  "Arabic",
  "Trade & Entrepreneurship",
];

/** Map of class name (as stored in DB) → its subject list */
const classSubjectsMap: Record<string, string[]> = {
  "grade two": primarySubjects,
  "grade three": primarySubjects,
  "grade four": primarySubjects,
  "grade five": primarySubjects,
  "jss 1": jssSubjects,
  "jss 2": jssSubjects,
  "jss 3": jssSubjects,
  "sss 1": ssSubjects,
  "sss 2": ssSubjects,
  "sss 3": ssSubjects,
};

// ─────────────────────────────────────────────────────────────────────────────

export async function main() {
  console.log("Starting database seeding...");

  // ── 1. Seed Super Admin ──────────────────────────────────────────────────
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
    `✅ Super Admin created/updated: ${superAdminUser.email} ${superAdminUser.id}`,
  );

  // ── 2. Seed Subjects for Cherish Academy classes ─────────────────────────
  const SCHOOL_SUBDOMAIN = "cherish";

  const school = await prisma.school.findUnique({
    where: { subdomain: SCHOOL_SUBDOMAIN },
    select: { id: true, name: true },
  });

  if (!school) {
    console.warn(
      `⚠️  School with subdomain "${SCHOOL_SUBDOMAIN}" not found. Skipping subject seeding.`,
    );
    return;
  }

  console.log(
    `🏫 Seeding subjects for school: ${school.name} (id: ${school.id})`,
  );

  // Fetch all existing classes for this school
  const existingClasses = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const cls of existingClasses) {
    const subjectList = classSubjectsMap[cls.name.toLowerCase()];

    if (!subjectList) {
      console.log(
        `  ⏭️  Skipping "${cls.name}" — not in subject map (may already be seeded or excluded).`,
      );
      continue;
    }

    const result = await prisma.subject.createMany({
      data: subjectList.map((subjectName) => ({
        name: subjectName.toLowerCase(),
        classId: cls.id,
      })),
      skipDuplicates: true, // safe to re-run; won't duplicate existing subjects
    });

    console.log(
      `  ✅ "${cls.name}" — ${result.count} subject(s) added (${subjectList.length - result.count} already existed).`,
    );
  }

  console.log("🎉 Subject seeding complete.");
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
