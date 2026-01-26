-- AlterTable
ALTER TABLE "Arm" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Video" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Arm" ADD CONSTRAINT "Arm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
