import { Router } from "express";
import Student from "../models/student.model.js";
import Application from "../models/application.model.js";
import { verifyAnyUser } from "../middlewares/auth.middleware.js";
import { pipeline } from "node:stream/promises";
import { fetchResume } from "../utils/resumeStorage.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const resumeRoutes = Router();

const sendPdf = async (res, fileName, originalName) => {
    const file = await fetchResume(fileName);
    if (!file) {
        throw new ApiError(404, "Resume file not found");
    }
    res.setHeader("Content-Type", "application/pdf");
    if (file.length) res.setHeader("Content-Length", file.length);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `inline; filename="${(originalName || "resume.pdf").replace(/[^\w.\- ]/g, "")}"`);
    await pipeline(file.stream, res);
};

// Resume submitted with a specific application: the applicant, the hiring company and admins
resumeRoutes.get("/application/:applicationId", verifyAnyUser, asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.applicationId);
    if (!application?.resume?.fileName) {
        throw new ApiError(404, "Resume not found");
    }

    const allowed =
        req.role === "admin" ||
        (req.role === "company" && String(application.company) === String(req.user._id)) ||
        (req.role === "student" && String(application.student) === String(req.user._id));
    if (!allowed) {
        throw new ApiError(403, "You are not allowed to view this resume");
    }

    await sendPdf(res, application.resume.fileName, application.resume.originalName);
}));

// A student's current profile resume: the student and admins
resumeRoutes.get("/student/:studentId", verifyAnyUser, asyncHandler(async (req, res) => {
    const allowed =
        req.role === "admin" ||
        (req.role === "student" && String(req.params.studentId) === String(req.user._id));
    if (!allowed) {
        throw new ApiError(403, "You are not allowed to view this resume");
    }

    const student = await Student.findById(req.params.studentId).select("resume");
    if (!student?.resume?.fileName) {
        throw new ApiError(404, "Resume not found");
    }
    await sendPdf(res, student.resume.fileName, student.resume.originalName);
}));

export default resumeRoutes;
