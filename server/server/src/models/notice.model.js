import mongoose from "mongoose";
import { CacheKeys, invalidateOnWrite } from "../utils/cache.js";

const Schema = mongoose.Schema;

const noticeSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    audience: {
        type: String,
        enum: ['students', 'recruiters', 'all'],
        default: 'all'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

noticeSchema.index({ audience: 1, createdAt: -1 });

noticeSchema.plugin(invalidateOnWrite, { keysFor: () => CacheKeys.allNotices() });

export default mongoose.model('Notice', noticeSchema);
