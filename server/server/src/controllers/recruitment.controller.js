import Application, { FINAL_STATUSES } from '../models/application.model.js';
import Job from '../models/job.model.js';
import Notice from '../models/notice.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from '../services/notification.service.js';
import { CacheKeys, cached } from '../utils/cache.js';

const NOTICE_CACHE_SECONDS = 300;

const STUDENT_FIELDS = 'name email phone rollNo degree branch cgpi tenthMarks twelfthMarks graduatingYear gender isPlaced';

// Loads an application and makes sure it belongs to the logged-in recruiter
const getOwnApplication = async (applicationId, companyId) => {
    const application = await Application.findById(applicationId)
        .populate('student', STUDENT_FIELDS)
        .populate('job', 'role type ctc location')
        .populate('company', 'name email');

    if (!application) {
        throw new ApiError(404, 'Application not found');
    }
    if (String(application.company._id) !== String(companyId)) {
        throw new ApiError(403, 'You are not authorized to manage this application');
    }
    return application;
};

const assertNotFinal = (application) => {
    if (FINAL_STATUSES.includes(application.status)) {
        throw new ApiError(400, 'The student has already responded to the offer; this application can no longer be changed');
    }
};

const formatDateTime = (date) => new Date(date).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
});

// GET /company/jobs/:jobId/applications
const getJobApplications = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
        throw new ApiError(404, 'Job not found');
    }
    if (String(job.company) !== String(req.company._id)) {
        throw new ApiError(403, 'You are not authorized to view applications for this job');
    }

    const applications = await Application.find({ job: job._id })
        .populate('student', STUDENT_FIELDS)
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, applications.filter((a) => a.student), 'Applications fetched successfully'));
});

// PATCH /company/applications/:id/shortlist
const shortlistApplication = asyncHandler(async (req, res) => {
    const application = await getOwnApplication(req.params.id, req.company._id);
    assertNotFinal(application);

    if (application.status !== 'applied') {
        throw new ApiError(400, 'Only new applications can be shortlisted');
    }

    application.setStatus('shortlisted', 'company');
    await application.save();
    await Job.updateOne({ _id: application.job._id }, { $addToSet: { shortlistedStudents: application.student._id } });

    res.status(200).json(new ApiResponse(200, application, 'Candidate shortlisted'));
});

// POST /company/applications/:id/interview  { scheduledAt, mode, venue, notes, sendEmail }
const scheduleInterview = asyncHandler(async (req, res) => {
    const { scheduledAt, mode, sendEmail: shouldEmail = true } = req.body;
    const venue = typeof req.body.venue === 'string' ? req.body.venue.slice(0, 500) : '';
    const notes = typeof req.body.notes === 'string' ? req.body.notes.slice(0, 1000) : '';
    const application = await getOwnApplication(req.params.id, req.company._id);
    assertNotFinal(application);

    if (!['shortlisted', 'interview_scheduled', 'interview_accepted'].includes(application.status)) {
        throw new ApiError(400, 'Shortlist the candidate before scheduling an interview');
    }

    const when = new Date(typeof scheduledAt === 'string' ? scheduledAt : NaN);
    if (!scheduledAt || isNaN(when.getTime())) {
        throw new ApiError(400, 'A valid interview date and time is required');
    }
    if (when < new Date()) {
        throw new ApiError(400, 'Interview time must be in the future');
    }
    if (!['online', 'offline'].includes(mode)) {
        throw new ApiError(400, "Mode must be 'online' or 'offline'");
    }
    if (!venue?.trim()) {
        throw new ApiError(400, mode === 'online' ? 'Meeting link is required' : 'Interview location is required');
    }

    const isReschedule = application.status !== 'shortlisted';
    application.interview = {
        scheduledAt: when,
        mode,
        venue: venue.trim(),
        notes: notes?.trim(),
        emailSent: false,
    };
    application.setStatus('interview_scheduled', 'company');
    // Saved before emailing so a queued email's outcome can be recorded on this application
    await application.save();

    let emailResult = null;
    if (shouldEmail) {
        const { student, job, company } = application;
        const place = mode === 'online' ? `Meeting link: ${venue}` : `Location: ${venue}`;
        const subject = `${isReschedule ? 'Rescheduled: ' : ''}Interview for ${job.role} at ${company.name}`;
        const text = [
            `Dear ${student.name},`,
            '',
            `You have been shortlisted for the ${job.role} role at ${company.name}.`,
            `Your interview is ${isReschedule ? 'rescheduled' : 'scheduled'} for ${formatDateTime(when)} (${mode}).`,
            place,
            notes ? `\nNotes from the recruiter: ${notes}` : '',
            '',
            'Please log in to HireBridge to accept the interview.',
            '',
            `Regards,\n${company.name}`,
        ].join('\n');

        emailResult = await notify(
            { to: student.email, subject, text },
            { interview: { applicationId: application._id, scheduledAt: when } }
        );
        if (!emailResult.queued) {
            // Already stored by notify(); mirrored here for the response
            application.interview.emailSent = emailResult.sent;
            application.interview.emailPreviewUrl = emailResult.previewUrl;
            application.interview.emailError = emailResult.error;
        }
    }

    const message = !shouldEmail
        ? 'Interview scheduled'
        : emailResult.queued
            ? 'Interview scheduled - the email to the student is on its way'
            : emailResult.sent
                ? 'Interview scheduled and email sent to the student'
                : 'Interview scheduled, but the email could not be sent';

    res.status(200).json(new ApiResponse(200, application, message));
});

// PATCH /company/applications/:id/decision  { decision: 'selected' | 'rejected' }
const decideApplication = asyncHandler(async (req, res) => {
    const { decision } = req.body;
    if (!['selected', 'rejected'].includes(decision)) {
        throw new ApiError(400, "Decision must be 'selected' or 'rejected'");
    }

    const application = await getOwnApplication(req.params.id, req.company._id);
    assertNotFinal(application);

    if (application.status === decision) {
        throw new ApiError(400, `Candidate is already marked ${decision}`);
    }

    application.setStatus(decision, 'company');
    await application.save();

    const { student, job, company } = application;
    const subject = decision === 'selected'
        ? `Offer: ${job.role} at ${company.name}`
        : `Update on your application for ${job.role} at ${company.name}`;
    const text = decision === 'selected'
        ? `Dear ${student.name},\n\nCongratulations! ${company.name} has selected you for the ${job.role} role.\nPlease log in to HireBridge to accept or decline the offer.\n\nRegards,\n${company.name}`
        : `Dear ${student.name},\n\nThank you for your interest in the ${job.role} role at ${company.name}. We will not be moving forward with your application at this time.\n\nRegards,\n${company.name}`;
    await notify({ to: student.email, subject, text });

    res.status(200).json(new ApiResponse(200, application, decision === 'selected' ? 'Candidate selected - offer sent' : 'Candidate rejected'));
});

// GET /company/notices
const getCompanyNotices = asyncHandler(async (req, res) => {
    const notices = await cached(CacheKeys.notices('recruiters'), NOTICE_CACHE_SECONDS, () =>
        Notice.find({ audience: { $in: ['recruiters', 'all'] } }).sort({ createdAt: -1 }).lean()
    );
    res.status(200).json(new ApiResponse(200, notices, 'Notices fetched successfully'));
});

// GET /company/stats
const getCompanyStats = asyncHandler(async (req, res) => {
    const companyId = req.company._id;
    const [activeJobs, counts, everShortlisted, interviews] = await Promise.all([
        Job.countDocuments({ company: companyId, lastDate: { $gte: new Date() } }),
        Application.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Candidates who reached the shortlist at any point, even if they have moved on since
        Application.countDocuments({ company: companyId, 'statusHistory.status': 'shortlisted' }),
        Application.countDocuments({ company: companyId, 'interview.scheduledAt': { $exists: true } }),
    ]);

    const byStatus = Object.fromEntries(counts.map(({ _id, count }) => [_id, count]));
    const total = counts.reduce((sum, { count }) => sum + count, 0);

    res.status(200).json(new ApiResponse(200, {
        activeJobs,
        totalApplications: total,
        shortlisted: everShortlisted,
        interviews,
        selected: byStatus.selected || 0,
        offersAccepted: byStatus.offer_accepted || 0,
        offersDeclined: byStatus.offer_declined || 0,
        rejected: byStatus.rejected || 0,
    }, 'Stats fetched successfully'));
});

export {
    getJobApplications,
    shortlistApplication,
    scheduleInterview,
    decideApplication,
    getCompanyNotices,
    getCompanyStats,
};
