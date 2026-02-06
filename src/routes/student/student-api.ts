import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { updateVideoProgress } from "../../controllers/sch_admin/materials";

import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";
import { logout } from "../../controllers/sch_admin/schoolAutth";

const router = Router();
router.post("/login", authSchoolUsersLogin, SchoolUsersLogin);

// Update video progress
router.post("/video/:videoId/progress", authenticate, updateVideoProgress);

export default router;
