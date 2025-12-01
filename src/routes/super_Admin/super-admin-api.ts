import { Router } from "express";
import { loginSuperAdmin } from "../../controllers/super_admin/superAdminAuth";
import { loginLimiter } from "../../middlewares/rateLimiter";
import {
  createSchoolWithAdmin,
  getAllSchools,
  toggleSchoolStatus,
  deleteSchool,
} from "../../controllers/super_admin/createSchool";
import { authenticate, requiredSuperAdmin } from "../../middlewares/auth";
import {
  getDashboardMetrics,
  getChartData,
  getRecentActivities,
} from "../../controllers/super_admin/dashboard";
import {
  validateLogin,
  validateCreateSchool,
  validate,
} from "../../middlewares/validations";
import { upload } from "../../middlewares/upload";

const router = Router();

// ========== SUPER ADMIN LOGIN ==========
router.post("/login", validate, validateLogin, loginLimiter, loginSuperAdmin);

// ========== SUPER ADMIN SCHOOLS ==========
router.post(
  "/create-school",
  authenticate,
  requiredSuperAdmin,
  upload.single("logo"),
  validateCreateSchool,
  validate,
  createSchoolWithAdmin
);

router.get("/schools", authenticate, requiredSuperAdmin, getAllSchools);
router.get(
  "/dashboard/metrics",
  authenticate,
  requiredSuperAdmin,
  getDashboardMetrics
);
router.get(
  "/dashboard/chart-data",
  authenticate,
  requiredSuperAdmin,
  getChartData
);
router.get(
  "/dashboard/recent-activities",
  authenticate,
  requiredSuperAdmin,
  getRecentActivities
);
router.patch(
  "/schools/:schoolId/status",
  authenticate,
  requiredSuperAdmin,
  toggleSchoolStatus
);
router.delete(
  "/schools/:schoolId",
  authenticate,
  requiredSuperAdmin,
  deleteSchool
);

export default router;
