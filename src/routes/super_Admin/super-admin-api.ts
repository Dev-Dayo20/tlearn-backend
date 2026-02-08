import { Router } from "express";
import { superAdminLogin } from "../../controllers/sch_admin/login";
import { loginLimiter } from "../../middlewares/rateLimiter";
import {
  createSchoolWithAdmin,
  getAllSchools,
  toggleSchoolStatus,
  deleteSchool,
} from "../../controllers/super_admin/createSchool";
import { newAuthenticate } from "../../middlewares/auth";
import { requiredSuperAdmin } from "../../middlewares/requiredAccess";
import {
  getDashboardMetrics,
  getChartData,
  getRecentActivities,
} from "../../controllers/super_admin/dashboard";
import {
  getUsersMetrics,
  getAllusers,
  userStatus,
} from "../../controllers/super_admin/users";
import {
  validateLogin,
  validateCreateSchool,
  validate,
  userPagination,
  stripUnknownQueries,
} from "../../middlewares/validations";
import { upload } from "../../middlewares/upload";

const router = Router();

// ========== SUPER ADMIN LOGIN ==========
router.post("/login", validate, validateLogin, loginLimiter, superAdminLogin);

// ========== SUPER ADMIN SCHOOLS ==========
router.post(
  "/create-school",
  newAuthenticate,
  requiredSuperAdmin,
  upload.single("logo"),
  validateCreateSchool,
  validate,
  createSchoolWithAdmin,
);

router.get("/schools", newAuthenticate, requiredSuperAdmin, getAllSchools);
router.get(
  "/dashboard/metrics",
  newAuthenticate,
  requiredSuperAdmin,
  getDashboardMetrics,
);
router.get(
  "/dashboard/chart-data",
  newAuthenticate,
  requiredSuperAdmin,
  getChartData,
);
router.get(
  "/dashboard/recent-activities",
  newAuthenticate,
  requiredSuperAdmin,
  getRecentActivities,
);
router.patch(
  "/schools/:schoolId/status",
  newAuthenticate,
  requiredSuperAdmin,
  toggleSchoolStatus,
);
router.delete(
  "/schools/:schoolId",
  newAuthenticate,
  requiredSuperAdmin,
  deleteSchool,
);

// ========== SUPER ADMIN USERS  ==========
router.get(
  "/users/metrics",
  newAuthenticate,
  requiredSuperAdmin,
  getUsersMetrics,
);
router.get(
  "/users",
  newAuthenticate,
  requiredSuperAdmin,
  userPagination,
  stripUnknownQueries,
  getAllusers,
);
router.patch(
  "/users/:userId/status",
  newAuthenticate,
  requiredSuperAdmin,
  userStatus,
);

export default router;
