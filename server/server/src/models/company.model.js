import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CacheKeys, invalidateOnWrite } from '../utils/cache.js';

const Schema = mongoose.Schema;

const companySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    website: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        trim: true
    },
    jobs: [{
        type: Schema.Types.ObjectId,
        ref: 'Job'
    }],
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    // Access to the portal is controlled by the admin: new accounts wait for approval
    accountStatus: {
        type: String,
        enum: ['pending', 'active', 'disabled'],
        default: 'pending'
    },
    enableRequest: {
        requested: {
            type: Boolean,
            default: false
        },
        message: String,
        requestedAt: Date
    },
    refreshToken: {
        type: String,
    },
    passwordResetToken: {
        type: String
    }
}, {
    timestamps: true
});

companySchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

companySchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

companySchema.methods.generateAccessToken = function () {
    return jwt.sign({
        // THIS IS THE FIX: Changed 'id' to '_id' to match MongoDB's default field name
        _id: this._id,
        name: this.name,
        email: this.email,
        role: 'company'
    }, process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        });
}

companySchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        // THIS IS THE FIX: Changed 'id' to '_id'
        _id: this._id,
    }, process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        });
}

companySchema.index({ accountStatus: 1, createdAt: -1 });
// Keeps the cached copy used by the auth middleware in sync
companySchema.plugin(invalidateOnWrite, { keysFor: (id) => (id ? [CacheKeys.user('company', id)] : []) });

const Company = mongoose.model('Company', companySchema);

export default Company;
