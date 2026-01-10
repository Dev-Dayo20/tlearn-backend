/*
  Warnings:

  - You are about to drop the column `arms` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `grade` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `arm` on the `User` table. All the data in the column will be lost.
  - Added the required column `name` to the `Class` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."User_role_idx";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "arms",
DROP COLUMN "grade",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "arm",
ADD COLUMN     "armId" INTEGER;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "armId" INTEGER;

-- CreateTable
CREATE TABLE "Arm" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_armId_idx" ON "User"("armId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arm" ADD CONSTRAINT "Arm_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
