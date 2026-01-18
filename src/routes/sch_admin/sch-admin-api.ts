import { Router } from "express";
import { getSchoolFromDomain } from "../../controllers/sch_admin/gerSchoolFromDomain";
import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { createClass } from "../../controllers/sch_admin/createClass";
import { getClasses } from "../../controllers/sch_admin/getClasses";
import { getClassDetails } from "../../controllers/sch_admin/getClasses";

// ========== MIDDLEWARES ==========
import { authenticate } from "../../middlewares/auth";
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";
import { requireSchAdmin } from "../../middlewares/requiredAccess";

const router = Router();

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

// ========== SCHOOL USERS LOGIN ==========
router.post("/login", authSchoolUsersLogin, SchoolUsersLogin);

// ========= SCHOOL ADMIN CREATE CLASS =========
router.post("/class", authenticate, authSchoolUsersLogin, createClass);

//======== SCHOOLADMIN FETCH CLASSES ===========
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

export default router;
