import mongoose from "mongoose";
import { CacheKeys, invalidateOnWrite } from "../utils/cache.js";

const Schema = mongoose.Schema;

const jobSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['internship', 'full-time', 'part-time']
    },
    ctc: {
        type: Number,
        required: true
    },
    eligibleBranches: [{
        type: String,
        required: true,
        lowercase: true,
        trim: true
    }],
    lastDate: {
        type: Date,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    eligibleBatch: {
        type: Number,
        required: true
    },
    minimumCgpa: {
        type: String,
        required: true
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    appliedStudents: [{
        type: Schema.Types.ObjectId,
        ref: 'Student'
    }],
    shortlistedStudents: [{
        type: Schema.Types.ObjectId,
        ref: 'Student'
    }],
},
{
    timestamps: true
});

jobSchema.index({ lastDate: 1 });
jobSchema.index({ company: 1 });

// updateOne/updateMany are left out on purpose: they only maintain the applicant arrays,
// which the cached job list does not include
jobSchema.plugin(invalidateOnWrite, {
    keysFor: () => [CacheKeys.activeJobs],
    queries: ['findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'deleteOne', 'replaceOne'],
});

export default mongoose.model('Job', jobSchema);