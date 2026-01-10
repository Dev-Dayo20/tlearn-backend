import { Router } from "express";
import { getSchoolFromDomain } from "../../controllers/sch_admin/gerSchoolFromDomain";
import { SchoolUsersLogin } from "../../controllers/sch_admin/schoolAutth";
import { createClass } from "../../controllers/sch_admin/createClass";

// ========== MIDDLEWARES ==========
import { authenticate } from "../../middlewares/auth";
import { authSchoolUsersLogin } from "../../middlewares/loginMiddleware";

const router = Router();

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

// ========== SCHOOL USERS LOGIN ==========
router.post("/login", authSchoolUsersLogin, SchoolUsersLogin);

// ========= SCHOOL ADMIN CREATE CLASS =========
router.post("/class", authSchoolUsersLogin, authenticate, createClass);

export default router;
