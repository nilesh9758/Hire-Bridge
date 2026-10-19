import { Router } from "express";
import { verifyAdmin } from "../middlewares/auth.middleware.js";
import {
    getStats,
    getUsers,
    updateUserStatus,
    getJobs,
    getJobDetails,
    deleteJob,
    getPlacements,
    createNotice,
    getNotices,
    deleteNotice,
} from "../controllers/admin.controller.js";

const adminRoutes = Router();

adminRoutes.use(verifyAdmin);

adminRoutes.get("/stats", getStats);
adminRoutes.get("/users", getUsers);
adminRoutes.patch("/users/:role/:id/status", updateUserStatus);
adminRoutes.get("/jobs", getJobs);
adminRoutes.get("/jobs/:id", getJobDetails);
adminRoutes.delete("/jobs/:id", deleteJob);
adminRoutes.get("/placements", getPlacements);
adminRoutes.get("/notices", getNotices);
adminRoutes.post("/notices", createNotice);
adminRoutes.delete("/notices/:id", deleteNotice);

export default adminRoutes;
