import { Router } from "express";
import { verifyCompany } from "../middlewares/auth.middleware.js";
import {
    getCompanyProfile,
    updateCompanyProfile,
    getCompanyJobs,
    createJob,
    getAppliedCandidates,
    shorlistCandidates,
    getShortlistedCandidates,
    deleteJob,
    updateJob,
    refreshCompanyToken
} from "../controllers/company.controller.js";
import {
    getJobApplications,
    shortlistApplication,
    scheduleInterview,
    decideApplication,
    getCompanyNotices,
    getCompanyStats
} from "../controllers/recruitment.controller.js";

const companyRoutes = Router();

// Login, logout, registration and password changes live under /api/auth

companyRoutes.get("/profile", verifyCompany, getCompanyProfile);
companyRoutes.put("/profile", verifyCompany, updateCompanyProfile);
companyRoutes.get("/jobs", verifyCompany, getCompanyJobs);
companyRoutes.post("/jobs", verifyCompany, createJob);
companyRoutes.get("/jobs/:jobId/candidates", verifyCompany, getAppliedCandidates);
companyRoutes.put("/jobs/:jobId/candidates/:candidateId", verifyCompany, shorlistCandidates);
companyRoutes.get("/jobs/:jobId/shortlisted", verifyCompany, getShortlistedCandidates);
companyRoutes.delete("/jobs/:jobId", verifyCompany, deleteJob);
companyRoutes.put("/jobs/:jobId", verifyCompany, updateJob);


companyRoutes.post("/refresh-token", refreshCompanyToken);

// Recruitment workflow
companyRoutes.get("/stats", verifyCompany, getCompanyStats);
companyRoutes.get("/notices", verifyCompany, getCompanyNotices);
companyRoutes.get("/jobs/:jobId/applications", verifyCompany, getJobApplications);
companyRoutes.patch("/applications/:id/shortlist", verifyCompany, shortlistApplication);
companyRoutes.post("/applications/:id/interview", verifyCompany, scheduleInterview);
companyRoutes.patch("/applications/:id/decision", verifyCompany, decideApplication);

export default companyRoutes;