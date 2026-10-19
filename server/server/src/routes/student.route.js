import { Router } from "express";
import { verifyStudent } from '../middlewares/auth.middleware.js';
import {
    getStudentProfile,
    completeStudentProfile,
    applyJob,
    withdrawApplication,
    getAppliedJobsByStudent,
    getShortlistedJobsByStudent,
    refreshStudentToken,
    getActiveJobs,
    getMyApplications,
    acceptInterview,
    respondToOffer,
    uploadResume,
    getStudentNotices
} from '../controllers/student.controller.js';
import { handleResumeUpload } from '../middlewares/upload.middleware.js';

const studentRoutes = Router();

// Login, logout, registration and password changes live under /api/auth

studentRoutes.post('/refresh-token', refreshStudentToken);
studentRoutes.get('/profile', verifyStudent, getStudentProfile);
studentRoutes.put('/complete-profile', verifyStudent, completeStudentProfile);
studentRoutes.post('/apply-job/:id', verifyStudent, applyJob);
studentRoutes.post('/withdraw-application/:id', verifyStudent, withdrawApplication);
studentRoutes.get('/applied-jobs', verifyStudent, getAppliedJobsByStudent);
studentRoutes.get('/shortlisted-jobs', verifyStudent, getShortlistedJobsByStudent);
studentRoutes.get('/jobs', verifyStudent, getActiveJobs);
studentRoutes.get('/applications', verifyStudent, getMyApplications);
studentRoutes.patch('/applications/:id/interview/accept', verifyStudent, acceptInterview);
studentRoutes.patch('/applications/:id/offer', verifyStudent, respondToOffer);
studentRoutes.post('/resume', verifyStudent, handleResumeUpload, uploadResume);
studentRoutes.get('/notices', verifyStudent, getStudentNotices);

export default studentRoutes;