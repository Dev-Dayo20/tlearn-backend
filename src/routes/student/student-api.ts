import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { newAuthenticate } from "../../middlewares/auth";
import { updateVideoProgress } from "../../controllers/sch_admin/materials";
import { getStudentLessons } from "../../controllers/student/student.lessons.controller";

import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";
import { logout } from "../../controllers/sch_admin/schoolAutth";
import { validate } from "../../lib/validators";
import { getStudentLessonsSchema } from "../../middlewares/zodSchema";

const router = Router();
router.post("/login", authSchoolUsersLogin, SchoolUsersLogin);

// Update video progress
router.post("/video/:videoId/progress", newAuthenticate, updateVideoProgress);

// ========== STUDENT LESSONS ==========
router.get(
  "/lessons",
  newAuthenticate,
  validate(getStudentLessonsSchema, "query"),
  getStudentLessons,
);

export default router;
