import {asyncHandler} from '../utils/asyncHandler.js';
import Student from '../models/student.model.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import Job from '../models/job.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Application from '../models/application.model.js';
import Notice from '../models/notice.model.js';
import { checkEligibility } from '../utils/eligibility.js';
import { assertAccountActive } from '../utils/accountStatus.js';
import { saveResume, deleteResume } from '../utils/resumeStorage.js';
import { setAuthCookies } from '../utils/cookies.js';
import { CacheKeys, cached } from '../utils/cache.js';
import { notify } from '../services/notification.service.js';

const generateAccessRefreshToken = async (studentId) => {
    try {
        const student = await Student.findById(studentId);
        if (!student) {
            throw new ApiError(404, "Student not found");
        }

        const accessToken = student.generateAccessToken();
        const refreshToken = student.generateRefreshToken();

        student.refreshToken = refreshToken;
        await student.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500,error, "Token generation failed");
    }
};

const getStudentProfile = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.student._id).select("-password -refreshToken -passwordResetToken");
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    const response = new ApiResponse(200, student);
    res.status(response.statusCode).json(response);
});

const completeStudentProfile = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.student._id);
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    const { name, rollNo, degree, cgpi, tenthMarks, twelfthMarks, graduatingYear, branch, phone } = req.body;

    if (!name || !rollNo || !degree || !cgpi || !tenthMarks || !twelfthMarks || !graduatingYear || !branch || !phone) {
        throw new ApiError(400, "All fields are required");
    }

    const numberInRange = (value, min, max, label) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < min || n > max) {
            throw new ApiError(400, `${label} must be between ${min} and ${max}`);
        }
        return n;
    };
    const text = (value, label, max = 100) => {
        if (typeof value !== 'string' && typeof value !== 'number') throw new ApiError(400, `${label} is invalid`);
        const s = String(value).trim();
        if (!s || s.length > max) throw new ApiError(400, `${label} is invalid`);
        return s;
    };

    student.name = text(name, 'Name');
    student.rollNo = text(rollNo, 'Roll number', 30);
    student.phone = text(phone, 'Phone', 20);
    student.cgpi = numberInRange(cgpi, 0, 10, 'CGPI');
    student.tenthMarks = numberInRange(tenthMarks, 0, 100, '10th marks');
    student.twelfthMarks = numberInRange(twelfthMarks, 0, 100, '12th marks');
    student.graduatingYear = numberInRange(graduatingYear, 2000, 2100, 'Graduating year');
    if (!['btech', 'mtech', 'mba'].includes(degree)) {
        throw new ApiError(400, 'Degree must be B.Tech, M.Tech or MBA');
    }
    if (req.body.gender !== undefined && req.body.gender !== '' && !['male', 'female', 'other'].includes(req.body.gender)) {
        throw new ApiError(400, 'Invalid gender');
    }
    if (req.body.gender) student.gender = req.body.gender;

    student.degree = degree;
    student.branch = text(branch, 'Branch', 20).toLowerCase();

    student.isProfileComplete = true;
    await student.save({ validateBeforeSave: false });

    const response = new ApiResponse(200, {}, "Profile completed successfully");
    res.status(response.statusCode).json(response);
});

const ACTIVE_JOBS_CACHE_SECONDS = 60;
const NOTICE_CACHE_SECONDS = 300;

const APPLICATION_JOB_FIELDS = 'role type ctc location lastDate eligibleBatch eligibleBranches minimumCgpa';

// Flattens an application into the shape the student pages use
const toStudentApplication = (application) => {
    const job = application.job || {};
    const company = application.company || {};
    return {
        _id: job._id,
        applicationId: application._id,
        role: job.role,
        type: job.type,
        ctc: job.ctc,
        location: job.location,
        lastDate: job.lastDate,
        companyName: company.name,
        companyDetails: { name: company.name, email: company.email, website: company.website },
        status: application.status,
        interview: application.interview,
        appliedAt: application.createdAt,
        updatedAt: application.updatedAt,
    };
};

const findStudentApplications = async (studentId, statuses) => {
    const filter = { student: studentId };
    if (statuses) filter.status = { $in: statuses };

    const applications = await Application.find(filter)
        .populate('job', APPLICATION_JOB_FIELDS)
        .populate('company', 'name email website')
        .sort({ updatedAt: -1 });

    // Jobs may have been removed by the admin
    return applications.filter((a) => a.job && a.company).map(toStudentApplication);
};

const getAppliedJobsByStudent = asyncHandler(async (req, res) => {
    res.status(200).json(await findStudentApplications(req.student._id));
});

const getShortlistedJobsByStudent = asyncHandler(async (req, res) => {
    res.status(200).json(await findStudentApplications(req.student._id, [
        'shortlisted', 'interview_scheduled', 'interview_accepted', 'selected', 'offer_accepted', 'offer_declined',
    ]));
});

const getMyApplications = asyncHandler(async (req, res) => {
    const applications = await findStudentApplications(req.student._id);
    res.status(200).json(new ApiResponse(200, applications, "Applications fetched successfully"));
});

const applyJob = asyncHandler(async (req, res) => {
    const { id: jobId } = req.params;

    const student = await Student.findById(req.student._id);
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    const job = await Job.findById(jobId);
    if (!job) {
        throw new ApiError(404, "Job not found");
    }

    const existing = await Application.findOne({ job: job._id, student: student._id });
    if (existing) {
        throw new ApiError(400, "You have already applied for this job");
    }

    const { eligible, reasons } = checkEligibility(student, job);
    if (!eligible) {
        throw new ApiError(400, `You are not eligible for this job: ${reasons.join('; ')}`);
    }

    if (!student.resume?.fileName) {
        throw new ApiError(400, "Upload your resume in Edit Profile before applying");
    }

    const application = new Application({
        job: job._id,
        student: student._id,
        company: job.company,
        resume: { fileName: student.resume.fileName, originalName: student.resume.originalName },
    });
    application.setStatus('applied', 'student');
    await application.save();

    // Keep the legacy arrays in sync for existing dashboards
    await Promise.all([
        Job.updateOne({ _id: job._id }, { $addToSet: { appliedStudents: student._id } }),
        Student.updateOne({ _id: student._id }, { $addToSet: { appliedJobs: job._id } }),
    ]);

    res.status(200).json(new ApiResponse(200, { applicationId: application._id }, "Job applied successfully"));
});

const withdrawApplication = asyncHandler(async (req, res) => {
    const { id: jobId } = req.params;
    const studentId = req.student._id;

    const application = await Application.findOne({ job: jobId, student: studentId });
    if (!application) {
        throw new ApiError(400, "You have not applied for this job");
    }
    if (application.status !== 'applied') {
        throw new ApiError(400, "You can only withdraw an application before the recruiter acts on it");
    }

    await Promise.all([
        application.deleteOne(),
        Job.updateOne({ _id: jobId }, { $pull: { appliedStudents: studentId } }),
        Student.updateOne({ _id: studentId }, { $pull: { appliedJobs: jobId } }),
    ]);

    res.status(200).json(new ApiResponse(200, {}, "Application withdrawn successfully"));
});

const getOwnApplication = async (applicationId, studentId) => {
    const application = await Application.findById(applicationId)
        .populate('job', APPLICATION_JOB_FIELDS)
        .populate('company', 'name email website');
    if (!application || String(application.student) !== String(studentId)) {
        throw new ApiError(404, "Application not found");
    }
    return application;
};

const formatDateTime = (date) => new Date(date).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
});

// PATCH /student/applications/:id/interview/accept
const acceptInterview = asyncHandler(async (req, res) => {
    const application = await getOwnApplication(req.params.id, req.student._id);

    if (application.status !== 'interview_scheduled') {
        throw new ApiError(400, "There is no pending interview to accept for this application");
    }

    application.interview.acceptedAt = new Date();
    application.setStatus('interview_accepted', 'student');
    await application.save();

    if (application.company?.email) {
        await notify({
            to: application.company.email,
            subject: `Interview accepted: ${req.student.name} for ${application.job.role}`,
            text: `${req.student.name} (${req.student.email}) has accepted the interview for ${application.job.role} scheduled on ${formatDateTime(application.interview.scheduledAt)}.`,
        });
    }

    res.status(200).json(new ApiResponse(200, toStudentApplication(application), "Interview accepted"));
});

// PATCH /student/applications/:id/offer  { decision: 'accept' | 'decline' }
const respondToOffer = asyncHandler(async (req, res) => {
    const { decision } = req.body;
    if (!['accept', 'decline'].includes(decision)) {
        throw new ApiError(400, "Decision must be 'accept' or 'decline'");
    }

    const application = await getOwnApplication(req.params.id, req.student._id);
    if (application.status !== 'selected') {
        throw new ApiError(400, "There is no pending offer for this application");
    }

    const student = await Student.findById(req.student._id);
    if (decision === 'accept' && student.isPlaced) {
        throw new ApiError(400, "You have already accepted another offer");
    }

    application.setStatus(decision === 'accept' ? 'offer_accepted' : 'offer_declined', 'student');
    await application.save();

    if (decision === 'accept') {
        student.isPlaced = true;
        student.placedCompany = application.company._id;
        student.placedJob = application.job._id;
        await student.save({ validateBeforeSave: false });
    }

    if (application.company?.email) {
        await notify({
            to: application.company.email,
            subject: `Offer ${decision === 'accept' ? 'accepted' : 'declined'}: ${student.name} for ${application.job.role}`,
            text: `${student.name} (${student.email}) has ${decision === 'accept' ? 'accepted' : 'declined'} your offer for ${application.job.role}.`,
        });
    }

    res.status(200).json(new ApiResponse(200, toStudentApplication(application), decision === 'accept' ? "Offer accepted - congratulations!" : "Offer declined"));
});

// POST /student/resume  (multipart/form-data, field "resume")
const uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Please choose a PDF file to upload");
    }

    const student = await Student.findById(req.student._id);
    const previous = student.resume?.fileName;

    const fileName = `${crypto.randomUUID()}.pdf`;
    await saveResume(fileName, req.file.buffer, req.file.originalname);

    student.resume = {
        fileName,
        originalName: req.file.originalname,
        uploadedAt: new Date(),
    };
    await student.save({ validateBeforeSave: false });

    // Delete the old file unless an application still references it
    if (previous && !(await Application.exists({ 'resume.fileName': previous }))) {
        deleteResume(previous).catch(() => {});
    }

    res.status(200).json(new ApiResponse(200, student.resume, "Resume uploaded successfully"));
});

// GET /student/notices
const getStudentNotices = asyncHandler(async (req, res) => {
    const notices = await cached(CacheKeys.notices('students'), NOTICE_CACHE_SECONDS, () =>
        Notice.find({ audience: { $in: ['students', 'all'] } }).sort({ createdAt: -1 }).lean()
    );
    res.status(200).json(new ApiResponse(200, notices, "Notices fetched successfully"));
});

const refreshStudentToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        throw new ApiError(401, "Refresh token not provided");
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const student = await Student.findOne({ _id: decoded._id, refreshToken });
    if (!student) {
        throw new ApiError(401, "Invalid refresh token");
    }
    assertAccountActive(student, 'student');

    const tokens = await generateAccessRefreshToken(student._id);
    setAuthCookies(res, tokens)
        .status(200)
        .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
});

// Open jobs are the same for every student, so the list is shared through the cache;
// eligibility and application status are worked out per student on top of it.
// Applicant arrays are left out: students don't need (and shouldn't see) who else applied.
const loadActiveJobs = () => cached(CacheKeys.activeJobs, ACTIVE_JOBS_CACHE_SECONDS, () =>
    Job.find({ lastDate: { $gte: new Date() } })
        .select('-appliedStudents -shortlistedStudents')
        .populate('company', 'name website')
        .sort({ lastDate: 1 })
        .lean()
);

// All open jobs, each flagged with whether this student may apply and why not
const getActiveJobs = asyncHandler(async (req, res) => {
    const student = req.student;

    const [jobs, applications] = await Promise.all([
        loadActiveJobs(),
        Application.find({ student: student._id }).select('job status'),
    ]);

    const statusByJob = Object.fromEntries(applications.map((a) => [String(a.job), a.status]));
    const now = new Date();

    const data = jobs
        // The cache may still hold a job whose deadline passed in the last minute
        .filter((job) => job.company && new Date(job.lastDate) >= now)
        .map((job) => ({
            ...job,
            eligibility: checkEligibility(student, job),
            applicationStatus: statusByJob[String(job._id)] || null,
        }));

    res.status(200).json(
         new ApiResponse(200, data, "Jobs fetched successfully")
    );
});

export {
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
};
