import Student from '../models/student.model.js';
import Company from '../models/company.model.js';
import Job from '../models/job.model.js';
import Application from '../models/application.model.js';
import Notice from '../models/notice.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CacheKeys, cached } from '../utils/cache.js';

const USER_MODELS = { student: Student, company: Company };
const NOTICE_CACHE_SECONDS = 300;
const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpires';

const getModel = (role) => {
    const Model = USER_MODELS[role];
    if (!Model) {
        throw new ApiError(400, "Role must be 'student' or 'company'");
    }
    return Model;
};

const getStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const [
        students, companies, pendingStudents, pendingCompanies,
        enableRequests, activeJobs, totalJobs, applications, placed, notices,
    ] = await Promise.all([
        Student.countDocuments(),
        Company.countDocuments(),
        Student.countDocuments({ accountStatus: 'pending' }),
        Company.countDocuments({ accountStatus: 'pending' }),
        Promise.all([
            Student.countDocuments({ accountStatus: 'disabled', 'enableRequest.requested': true }),
            Company.countDocuments({ accountStatus: 'disabled', 'enableRequest.requested': true }),
        ]).then(([s, c]) => s + c),
        Job.countDocuments({ lastDate: { $gte: now } }),
        Job.countDocuments(),
        Application.countDocuments(),
        Student.countDocuments({ isPlaced: true }),
        Notice.countDocuments(),
    ]);

    res.status(200).json(new ApiResponse(200, {
        students, companies,
        pendingApprovals: pendingStudents + pendingCompanies,
        pendingStudents, pendingCompanies,
        enableRequests, activeJobs, totalJobs, applications, placed, notices,
    }, 'Stats fetched successfully'));
});

// GET /users?role=student|company&status=pending|active|disabled|requests
const getUsers = asyncHandler(async (req, res) => {
    const Model = getModel(req.query.role);
    const filter = {};

    if (req.query.status === 'requests') {
        filter.accountStatus = 'disabled';
        filter['enableRequest.requested'] = true;
    } else if (req.query.status) {
        filter.accountStatus = req.query.status;
    }

    let query = Model.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 });
    if (req.query.role === 'student') {
        query = query.populate('placedCompany', 'name');
    }
    const users = await query;

    res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));
});

// PATCH /users/:role/:id/status  { status: 'active' | 'disabled' }
const updateUserStatus = asyncHandler(async (req, res) => {
    const Model = getModel(req.params.role);
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
        throw new ApiError(400, "Status must be 'active' or 'disabled'");
    }

    const user = await Model.findById(req.params.id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    user.accountStatus = status;
    if (status === 'active') {
        user.enableRequest = { requested: false };
    } else {
        user.refreshToken = undefined; // force logout on next refresh
    }
    await user.save({ validateBeforeSave: false });

    const updated = await Model.findById(user._id).select(SAFE_FIELDS);
    res.status(200).json(new ApiResponse(200, updated, status === 'active' ? 'Account enabled' : 'Account disabled'));
});

const getJobs = asyncHandler(async (req, res) => {
    const jobs = await Job.find()
        .populate('company', 'name email website')
        .sort({ createdAt: -1 })
        .lean();

    const counts = await Application.aggregate([
        { $group: { _id: { job: '$job', status: '$status' }, count: { $sum: 1 } } },
    ]);
    const byJob = {};
    for (const { _id, count } of counts) {
        const key = String(_id.job);
        byJob[key] = byJob[key] || { total: 0 };
        byJob[key][_id.status] = count;
        byJob[key].total += count;
    }

    const data = jobs.map((job) => ({
        ...job,
        isActive: new Date(job.lastDate) >= new Date(),
        applicationCounts: byJob[String(job._id)] || { total: 0 },
    }));

    res.status(200).json(new ApiResponse(200, data, 'Jobs fetched successfully'));
});

const getJobDetails = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id).populate('company', 'name email website phone address');
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const applications = await Application.find({ job: job._id })
        .populate('student', 'name email rollNo branch cgpi graduatingYear')
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { job, applications }, 'Job fetched successfully'));
});

const deleteJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    await Promise.all([
        Job.findByIdAndDelete(job._id),
        Application.deleteMany({ job: job._id }),
        Company.updateOne({ _id: job.company }, { $pull: { jobs: job._id } }),
        Student.updateMany(
            { $or: [{ appliedJobs: job._id }, { shortlistedJobs: job._id }] },
            { $pull: { appliedJobs: job._id, shortlistedJobs: job._id } }
        ),
    ]);

    res.status(200).json(new ApiResponse(200, {}, 'Job posting removed'));
});

// Every application with student + company, for the placement tracker
const getPlacements = asyncHandler(async (req, res) => {
    const applications = await Application.find()
        .populate('student', 'name email rollNo branch graduatingYear isPlaced')
        .populate('company', 'name')
        .populate('job', 'role type ctc location')
        .sort({ updatedAt: -1 });

    const placedStudents = await Student.find({ isPlaced: true })
        .select('name email rollNo branch graduatingYear placedCompany placedJob')
        .populate('placedCompany', 'name')
        .populate('placedJob', 'role ctc');

    res.status(200).json(new ApiResponse(200, {
        applications: applications.filter((a) => a.student && a.company && a.job),
        placedStudents,
    }, 'Placements fetched successfully'));
});

const createNotice = asyncHandler(async (req, res) => {
    const { title, message, audience } = req.body;

    if (!title?.trim() || !message?.trim()) {
        throw new ApiError(400, 'Title and message are required');
    }
    if (!['students', 'recruiters', 'all'].includes(audience)) {
        throw new ApiError(400, "Audience must be 'students', 'recruiters' or 'all'");
    }

    const notice = await Notice.create({ title, message, audience, createdBy: req.admin._id });
    res.status(201).json(new ApiResponse(201, notice, 'Notice posted'));
});

const getNotices = asyncHandler(async (req, res) => {
    const notices = await cached(CacheKeys.notices('admin'), NOTICE_CACHE_SECONDS, () =>
        Notice.find().sort({ createdAt: -1 }).lean()
    );
    res.status(200).json(new ApiResponse(200, notices, 'Notices fetched successfully'));
});

const deleteNotice = asyncHandler(async (req, res) => {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
        throw new ApiError(404, 'Notice not found');
    }
    res.status(200).json(new ApiResponse(200, {}, 'Notice deleted'));
});

export {
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
};
