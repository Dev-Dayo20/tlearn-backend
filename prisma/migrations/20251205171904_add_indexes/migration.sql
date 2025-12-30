-- AlterTable
ALTER TABLE "User" ALTER COLUMN "schoolId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "School_isActive_idx" ON "School"("isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
