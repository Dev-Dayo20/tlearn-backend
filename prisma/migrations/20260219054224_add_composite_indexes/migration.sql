-- DropIndex
DROP INDEX "Video_classId_idx";

-- CreateIndex
CREATE INDEX "Class_schoolId_isActive_idx" ON "Class"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "Subject_teacherId_idx" ON "Subject"("teacherId");

-- CreateIndex
CREATE INDEX "User_schoolId_role_isActive_idx" ON "User"("schoolId", "role", "isActive");

-- CreateIndex
CREATE INDEX "User_classId_role_idx" ON "User"("classId", "role");

-- CreateIndex
CREATE INDEX "Video_classId_uploadedAt_idx" ON "Video"("classId", "uploadedAt");

-- CreateIndex
CREATE INDEX "VideoProgress_lastWatchedAt_idx" ON "VideoProgress"("lastWatchedAt");

-- CreateIndex
CREATE INDEX "VideoProgress_studentId_lastWatchedAt_idx" ON "VideoProgress"("studentId", "lastWatchedAt");

-- CreateIndex
CREATE INDEX "VideoProgress_studentId_isCompleted_idx" ON "VideoProgress"("studentId", "isCompleted");
