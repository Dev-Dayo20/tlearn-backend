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
  getStudentAnalytics,
} from "../../controllers/sch_admin/materials";
import { getDashboardStats } from "../../controllers/sch_admin/dashboard";
import { classes } from "../../controllers/sch_admin/createClass";

// ========== MIDDLEWARES ==========
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";
import { requireSchAdmin } from "../../middlewares/requiredAccess";
import { upload, uploadVideo } from "../../middlewares/upload";
import { newAuthenticate } from "../../middlewares/auth";
import { attachSchoolContext } from "../../middlewares/loginMiddleware";

const router = Router();

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

// ========== SCHOOL USERS LOGIN ==========
router.post("/login", SchoolUsersLogin);

// ========= SCHOOL ADMIN CREATE CLASS =========
router.post("/class", newAuthenticate, createClass);

//======== SCHOOLADMIN FETCH CLASSES ===========
router.get("/classes/list", newAuthenticate, requireSchAdmin, classes);

router.get("/classes", newAuthenticate, requireSchAdmin, getClasses);
router.get("/classes/:id", newAuthenticate, requireSchAdmin, getClassDetails);

//========= SCHOOL ADMIN TEACHER ==========
router.post("/teacher", newAuthenticate, requireSchAdmin, createTeacher);

router.get("/teachers", newAuthenticate, requireSchAdmin, getTeachers);

// ========== SCHOOL ADMIN STUDENTS ==========
router.post(
  "/register/students",
  newAuthenticate,
  requireSchAdmin,
  upload.single("profilePicture"),
  createStudents,
);

router.get("/students", newAuthenticate, requireSchAdmin, getStudents);

router.get(
  "/students/:id/analytics",
  newAuthenticate,
  requireSchAdmin,
  getStudentAnalytics,
);

// ========== SCHOOL ADMIN MATERIALS ==========
router.post(
  "/materials/create",
  newAuthenticate,
  requireSchAdmin,
  uploadVideo.single("video"),
  createMaterial,
);
router.get("/materials", newAuthenticate, requireSchAdmin, getMaterials);

router.patch(
  "/materials/:id",
  newAuthenticate,
  requireSchAdmin,
  updateMaterial,
);

router.delete(
  "/materials/:id",
  newAuthenticate,
  requireSchAdmin,
  deleteMaterial,
);

// ========== SCHOOL ADMIN DASHBOARD ==========
router.get(
  "/dashboard/stats",
  newAuthenticate,
  requireSchAdmin,
  getDashboardStats,
);
export default router;
