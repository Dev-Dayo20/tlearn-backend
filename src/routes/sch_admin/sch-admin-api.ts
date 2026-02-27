import { Router } from "express";
import { getSchoolFromDomain } from "../../controllers/sch_admin/gerSchoolFromDomain";
import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { createClass } from "../../controllers/sch_admin/createClass";
import { getClasses } from "../../controllers/sch_admin/getClasses";
import { getClassDetails } from "../../controllers/sch_admin/getClasses";
import {
  createTeacher,
  updateTeacher,
  getTeachers,
  assignTeacherToClass,
} from "../../controllers/sch_admin/teacher";
import {
  createStudents,
  getStudents,
  updateStudent,
  deleteStudent,
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
import {
  createSubject,
  getAllSubjectsForPagination,
  getAllSubjects,
  updateSubject,
} from "../../controllers/sch_admin/subject";

// ========== MIDDLEWARES ==========
import { z } from "zod";
import { requireSchAdmin } from "../../middlewares/requiredAccess";
import { upload, uploadVideo } from "../../middlewares/upload";
import { newAuthenticate } from "../../middlewares/auth";
import { attachSchoolContext } from "../../middlewares/loginMiddleware";
import { validate } from "../../lib/validators";
import {
  createSubjectSchema,
  getSubjectsPaginationSchema,
  updateSubjectSchema,
  assignTeacherToClassSchema,
} from "../../middlewares/zodSchema";

const router = Router();

const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((val: string) => parseInt(val)),
});

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

// ========== SCHOOL USERS LOGIN ==========
router.post("/login", attachSchoolContext, SchoolUsersLogin);

//======== SCHOOLADMIN CLASSES ===========
router.post("/class", newAuthenticate, attachSchoolContext, createClass);

router.get(
  "/classes/list",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  classes,
);

router.get(
  "/classes",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getClasses,
);
router.get(
  "/classes/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getClassDetails,
);

//========= SCHOOL ADMIN TEACHER ==========
router.post(
  "/teacher",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  // upload.single("profilePicture"),
  createTeacher,
);

router.get(
  "/teachers",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getTeachers,
);

router.patch(
  "/teacher/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  updateTeacher,
);

router.patch(
  "/teacher/:id/assign",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  validate(idParamSchema, "params"),
  validate(assignTeacherToClassSchema),
  assignTeacherToClass,
);

//======== SCHOOL ADMIN SUBJECT ===========
router.post(
  "/subject",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  validate(createSubjectSchema),
  createSubject,
);
router.get(
  "/subjects",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  validate(getSubjectsPaginationSchema, "query"),
  getAllSubjectsForPagination,
);

router.get(
  "/subjects/all",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getAllSubjects,
);

router.patch(
  "/subject/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  validate(idParamSchema, "params"),
  validate(updateSubjectSchema),
  updateSubject,
);

// ========== SCHOOL ADMIN STUDENTS ==========
router.post(
  "/register/students",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  upload.single("profilePicture"),
  createStudents,
);

router.get(
  "/students",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getStudents,
);

router.get(
  "/students/:id/analytics",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getStudentAnalytics,
);

router.patch(
  "/students/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  // upload.single("profilePicture"),
  updateStudent,
);

router.delete(
  "/students/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  deleteStudent,
);

// ========== SCHOOL ADMIN MATERIALS ==========
router.post(
  "/materials/create",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  uploadVideo.single("video"),
  createMaterial,
);
router.get(
  "/materials",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getMaterials,
);

router.patch(
  "/materials/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  updateMaterial,
);

router.delete(
  "/materials/:id",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  deleteMaterial,
);

// ========== SCHOOL ADMIN DASHBOARD ==========
router.get(
  "/dashboard/stats",
  newAuthenticate,
  attachSchoolContext,
  requireSchAdmin,
  getDashboardStats,
);

export default router;
