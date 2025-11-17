import { Router } from "express";
import schAdminRoutes from "./sch_admin/sch-admin-api";
import studentRoutes from "./student/student-api";
import superAdminRoutes from "./super_Admin/super-admin-api";
const router = Router();

// Mounting the sub-routers
router.use("/sch-admin", schAdminRoutes);
router.use("/student", studentRoutes);
router.use("/super-admin", superAdminRoutes);

export default router;
