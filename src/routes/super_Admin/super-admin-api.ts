import { Router } from "express";
import { loginSuperAdmin } from "../../controllers/super_admin/superAdminAuth";
import { loginLimiter } from "../../middlewares/rateLimiter";
import {
  createSchoolWithAdmin,
  getAllSchools,
  toggleSchoolStatus,
} from "../../controllers/super_admin/createSchool";
import { authenticate, requiredSuperAdmin } from "../../middlewares/auth";

const router = Router();

// ========== SUPER ADMIN LOGIN ==========
router.post("/login", loginLimiter, loginSuperAdmin);

// ========== SUPER ADMIN SCHOOLS ==========
router.post(
  "/create-school",
  authenticate,
  requiredSuperAdmin,
  createSchoolWithAdmin
);

router.get("/schools", authenticate, requiredSuperAdmin, getAllSchools);
router.patch(
  "/schools/schoolId/status",
  authenticate,
  requiredSuperAdmin,
  toggleSchoolStatus
);
export default router;
