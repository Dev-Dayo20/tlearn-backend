import { Router } from "express";
import { getSchoolFromDomain } from "../../controllers/sch_admin/gerSchoolFromDomain";
import { authenticate, requiredSuperAdmin } from "../../middlewares/auth";

const router = Router();

// ========== GET SCHOOL FROM DOMAIN ==========
router.get("/school/:subdomain", getSchoolFromDomain);

export default router;
