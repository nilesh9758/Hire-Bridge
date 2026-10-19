import {asyncHandler} from '../utils/asyncHandler.js';
import Student from '../models/student.model.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import Job from '../models/job.model.js';
import Company from '../models/company.model.js'
import jwt from 'jsonwebtoken';
import Application from '../models/application.model.js';
import { assertAccountActive } from '../utils/accountStatus.js';
import { setAuthCookies } from '../utils/cookies.js';

const generateAccessRefreshTokens = async (companyId) => {
    try {
        const company = await Company.findById(companyId);
        if (!company) {
            throw new ApiError(404, 'Company not found');
        }

        const accessToken = company.generateAccessToken();
        const refreshToken = company.generateRefreshToken();
        company.refreshToken = refreshToken;
        await company.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, 'Token generation failed');
    }
};

const getCompanyProfile = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.company._id).select('-password -refreshToken');
    if (!company) {
        throw new ApiError(404, 'Company not found');
    }

    res.status(200).json(new ApiResponse(200, company, 'Company profile retrieved successfully'));
});

const updateCompanyProfile = asyncHandler(async (req, res) => {
    const clean = (value) => (typeof value === 'string' ? value.trim().slice(0, 300) : undefined);
    const name = clean(req.body.name);
    const address = clean(req.body.address);
    const website = clean(req.body.website);
    const phone = clean(req.body.phone);

    if (!name && !website && !address && !phone) {
        throw new ApiError(400, 'At least one field is required');
    }

    const company = await Company.findById(req.company._id);
    if (!company) {
        throw new ApiError(404, 'Company not found');
    }

    if(name) company.name = name;
    if(address) company.address = address;
    if(website) company.website = website;
    if(phone) company.phone = phone;

    const requiredFileds = ['name', 'address', 'website', 'phone'];
    const isProfileComplete = requiredFileds.every(field => company[field]);
    company.isProfileComplete = isProfileComplete;

    await company
    .save({ validateBeforeSave: false });
    const updatedCompany = await Company.findById(company._id).select('-password -refreshToken -passwordResetToken');
    res.status(200).json(new ApiResponse(200, updatedCompany, 'Company profile updated successfully'));
});

const getCompanyJobs = asyncHandler(async (req, res) => {
    const jobs = await Job.find({ company: req.company._id });
    if (!jobs) {
        throw new ApiError(404, 'No jobs found');
    }

    // **FIX:** Swapped the 'data' and 'message' arguments to ensure a consistent API response.
    // The 'jobs' array is now correctly passed as the data payload.
    res.status(200).json(new ApiResponse(200, jobs, 'Company jobs retrieved successfully'));
});

const createJob = asyncHandler(async (req, res) => {
    const {
        type,
        ctc, // Renamed from salary for consistency with the model
        eligibleBranches, // Renamed from eligiblebranches
        lastDate, // Renamed from deadline
        role,
        location,
        eligibleBatch,
        minimumCgpa, // Renamed from qualification
    } = req.body;

    // Validate required fields
    const requiredFields = { type, ctc, eligibleBranches, lastDate, role, location, eligibleBatch, minimumCgpa };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value || String(value).trim() === "") {
            throw new ApiError(400, `${key} is a required field.`);
        }
    }
    
    if ([type, role, location, eligibleBranches, lastDate].some((v) => typeof v !== 'string')) {
        throw new ApiError(400, 'Invalid job details');
    }
    if (!(Number(ctc) >= 0) || !(Number(eligibleBatch) > 1999)) {
        throw new ApiError(400, 'CTC and eligible batch must be valid numbers');
    }
    if (isNaN(new Date(lastDate).getTime())) {
        throw new ApiError(400, 'Invalid application deadline');
    }

    // Convert comma-separated string of branches to an array
    const eligibleBranchesArray = eligibleBranches.split(',').map(branch => branch.trim().toLowerCase());

    // --- FIX FOR THE DATE ---
    // Create a date object from the YYYY-MM-DD string
    const deadlineDate = new Date(lastDate);
    // Set the time to the end of that day in the server's local timezone
    deadlineDate.setHours(23, 59, 59, 999);
    // Mongoose will automatically convert this to UTC upon saving

    const job = await Job.create({
        company: req.company._id,
        type,
        ctc: Number(ctc), // Ensure ctc is saved as a number
        eligibleBranches: eligibleBranchesArray,
        lastDate: deadlineDate, // Use the adjusted date object
        role,
        location,
        eligibleBatch: Number(eligibleBatch), // Ensure batch is a number
        minimumCgpa,
    });

    if (!job) {
        throw new ApiError(500, 'Job creation failed. Please try again.');
    }

    const company = await Company.findById(req.company._id);
    if (company) {
        company.jobs.push(job._id);
        await company.save({ validateBeforeSave: false });
    }
    const createdJob = await Job.findById(job._id).populate('company', 'name email');

    if (!createdJob) {
        throw new ApiError(500, 'Failed to retrieve created job details.');
    }
    
    return res.status(201).json(new ApiResponse(201, createdJob, 'Job created successfully'));
});

const getAppliedCandidates = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // **FIX:** Use .populate() to get the full student documents directly.
    // This is more efficient than a separate Student.find() query.
    const job = await Job.findById(jobId).populate('appliedStudents', '-password -refreshToken -passwordResetToken -passwordResetExpires');

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const isCreatedBySameCompany = job.company.toString() === req.company._id.toString();
    if (!isCreatedBySameCompany) {
        throw new ApiError(403, 'You are not authorized to view candidates for this job');
    }

    // The full student documents are now in job.appliedStudents
    const candidates = job.appliedStudents;

    // It's not an error if no one applied, just return an empty array.
    if (!candidates || candidates.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], 'No candidates have applied yet.'));
    }

    res.status(200).json(new ApiResponse(200, candidates, 'Candidates retrieved successfully'));
});

const shorlistCandidates = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const isCreatedBySameCompany = job.company.toString() === req.company._id.toString();
    if (!isCreatedBySameCompany) {
        throw new ApiError(403, 'You are not authorized to shortlist candidates for this job');
    }

    const students = await Student.find({ appliedJobs: job._id });
    if (!students) {
        throw new ApiError(404, 'No candidates found');
    }
    try {
        const requestedIds = (req.body.students || []).map(String);
        const shortlistedStudents = students.filter(student => requestedIds.includes(student._id.toString()));
        job.shortlistedStudents = shortlistedStudents.map(student => student._id);
        await job.save({ validateBeforeSave: false });

        await Student.updateMany(
            { _id: { $in: shortlistedStudents.map(student => student._id) } },
            { $addToSet: { shortlistedJobs: job._id } }
        );
    } catch (error) {
        throw new ApiError(500, 'Shortlisting candidates failed');
    }

    res.status(200).json(new ApiResponse(200, 'Candidates shortlisted successfully', job.shortlistedStudents));
});

const getShortlistedCandidates = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const isCreatedBySameCompany = job.company.toString() === req.company._id.toString();
    if (!isCreatedBySameCompany) {
        throw new ApiError(403, 'You are not authorized to view shortlisted candidates for this job');
    }

    const students = await Student.find({ shortlistedJobs: job._id }).select('-password -refreshToken -passwordResetToken -passwordResetExpires');
    if (!students) {
        throw new ApiError(404, 'No shortlisted candidates found');
    }

    res.status(200).json(new ApiResponse(200, 'Shortlisted candidates retrieved successfully', students));
});

const deleteJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Verify that the job belongs to the company making the request
    const isCreatedBySameCompany = job.company.toString() === req.company._id.toString();
    if (!isCreatedBySameCompany) {
        throw new ApiError(403, 'You are not authorized to delete this job');
    }

    // **FIX:** Use the modern findByIdAndDelete method instead of the deprecated .remove()
    await Job.findByIdAndDelete(jobId);
    await Application.deleteMany({ job: jobId });
    await Company.updateOne({ _id: req.company._id }, { $pull: { jobs: jobId } });

    // Also, pull this job's ID from any students who applied or were shortlisted
    await Student.updateMany(
        { $or: [{ appliedJobs: jobId }, { shortlistedJobs: jobId }] },
        { $pull: { appliedJobs: jobId, shortlistedJobs: jobId } }
    );

    res.status(200).json(new ApiResponse(200, {}, 'Job deleted successfully'));
});

const updateJob = asyncHandler(async (req, res) => {
    const { title, description, location, salary, deadline } = req.body;

    if (!title || !description || !location || !salary || !deadline) {
        throw new ApiError(400, 'All fields are required');
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    const isCreatedBySameCompany = job.company.toString() === req.company._id.toString();
    if (!isCreatedBySameCompany) {
        throw new ApiError(403, 'You are not authorized to update this job');
    }

    job.title = title;
    job.description = description;
    job.location = location;
    job.salary = salary;
    job.deadline = deadline;

    await job.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, 'Job updated successfully', job));
});

const refreshCompanyToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized: No refresh token provided");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const company = await Company.findById(decodedToken._id);

        if (!company || company.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }
        assertAccountActive(company, 'company');
        
        const { accessToken, refreshToken } = await generateAccessRefreshTokens(company._id);

        return setAuthCookies(res, { accessToken, refreshToken })
            .status(200)
            .json(new ApiResponse(200, {}, "Token refreshed successfully"));

    } catch (error) {
        if (error instanceof ApiError && error.statusCode === 403) throw error;
        throw new ApiError(401, "Invalid refresh token");
    }
});

export {
    generateAccessRefreshTokens,
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
};