import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Lifecycle of a student's application to a job:
// applied -> shortlisted -> interview_scheduled -> interview_accepted -> selected -> offer_accepted | offer_declined
// The recruiter can mark a candidate rejected (or selected) at any point before the offer is answered.
export const APPLICATION_STATUSES = [
    'applied',
    'shortlisted',
    'interview_scheduled',
    'interview_accepted',
    'selected',
    'rejected',
    'offer_accepted',
    'offer_declined',
];

// Statuses after which the recruiter can no longer change the outcome
export const FINAL_STATUSES = ['offer_accepted', 'offer_declined'];

const applicationSchema = new Schema({
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: 'applied'
    },
    // Snapshot of the resume the student had when applying
    resume: {
        fileName: String,
        originalName: String
    },
    interview: {
        scheduledAt: Date,
        mode: {
            type: String,
            enum: ['online', 'offline']
        },
        venue: String, // meeting link or physical location
        notes: String,
        emailSent: {
            type: Boolean,
            default: false
        },
        emailPreviewUrl: String,
        emailError: String,
        acceptedAt: Date
    },
    statusHistory: [{
        status: String,
        at: {
            type: Date,
            default: Date.now
        },
        by: {
            type: String,
            enum: ['student', 'company', 'admin']
        }
    }]
}, {
    timestamps: true
});

applicationSchema.index({ job: 1, student: 1 }, { unique: true });
applicationSchema.index({ student: 1, updatedAt: -1 });
applicationSchema.index({ company: 1, status: 1 });
applicationSchema.index({ 'resume.fileName': 1 });

applicationSchema.methods.setStatus = function (status, by) {
    this.status = status;
    this.statusHistory.push({ status, by });
};

export default mongoose.model('Application', applicationSchema);
