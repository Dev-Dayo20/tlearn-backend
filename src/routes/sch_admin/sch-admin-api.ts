import { Router } from "express";
import { getSchoolFromDomain } from "../../controllers/sch_admin/gerSchoolFromDomain";
import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { createClass } from "../../controllers/sch_admin/createClass";
import { getClasses } from "../../controllers/sch_admin/getClasses";
import { getClassDetails } from "../../controllers/sch_admin/getClasses";
import { createTeacher } from "../../controllers/sch_admin/teacher";
import { getTeachers } from "../../controllers/sch_admin/teacher";
import {
  createStudents,
  getStudents,
} from "../../controllers/sch_admin/students";
import {
  createMaterial,
  getMaterials,
  updateMaterial,
  deleteMaterial,
} from "../../controllers/sch_admin/materials";
import { getDashboardStats } from "../../controllers/sch_admin/dashboard";
import { classes } from "../../controllers/sch_admin/createClass";

// ========== MIDDLEWARES ==========
import { authenticate } from "../../middlewares/auth";
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";
import { requireSchAdmin } from "../../middlewares/requiredAccess";
import { upload, uploadVideo } from "../../middlewares/upload";

const router = Router();

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

// ========== SCHOOL USERS LOGIN ==========
router.post("/login", authSchoolUsersLogin, SchoolUsersLogin);

// ========= SCHOOL ADMIN CREATE CLASS =========
router.post("/class", authenticate, authSchoolUsersLogin, createClass);

//======== SCHOOLADMIN FETCH CLASSES ===========
router.get(
  "/classes/list",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  classes,
);

router.get(
  "/classes",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getClasses,
);
router.get(
  "/classes/:id",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getClassDetails,
);

//========= SCHOOL ADMIN TEACHER ==========
router.post(
  "/teacher",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  createTeacher,
);

router.get(
  "/teachers",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getTeachers,
);

// ========== SCHOOL ADMIN STUDENTS ==========
router.post(
  "/register/students",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  upload.single("profilePicture"),
  createStudents,
);

router.get(
  "/students",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getStudents,
);

// ========== SCHOOL ADMIN MATERIALS ==========
router.post(
  "/materials/create",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  uploadVideo.single("video"),
  createMaterial,
);
router.get(
  "/materials",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getMaterials,
);

router.patch(
  "/materials/:id",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  updateMaterial,
);

router.delete(
  "/materials/:id",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  deleteMaterial,
);

// ========== SCHOOL ADMIN DASHBOARD ==========
router.get(
  "/dashboard/stats",
  authenticate,
  authSchoolUsersLogin,
  requireSchAdmin,
  getDashboardStats,
);
export default router;
