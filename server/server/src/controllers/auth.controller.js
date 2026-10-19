import Student from '../models/student.model.js';
import Company from '../models/company.model.js';
import Admin from '../models/admin.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertAccountActive } from '../utils/accountStatus.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import jwt from 'jsonwebtoken';

const MODELS = { admin: Admin, company: Company, student: Student };
const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpires';
const MIN_PASSWORD_LENGTH = 8;

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

// Only plain strings are accepted from the client (guards against operator injection)
const asString = (value) => (typeof value === 'string' ? value : '');

// Looks the email up across all three account types
const findUserByEmail = async (email) => {
    const normalized = asString(email).trim();
    if (!normalized) return { user: null, role: null };
    for (const role of ['admin', 'company', 'student']) {
        const query = role === 'admin' ? { email: normalized.toLowerCase() } : { email: normalized };
        const user = await MODELS[role].findOne(query);
        if (user) return { user, role };
    }
    return { user: null, role: null };
};

const validatePassword = (password) => {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        throw new ApiError(400, 'Password must contain at least one letter and one number');
    }
};

const generateAccessRefreshTokens = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, 'Token generation failed');
    }
};

const decodeAccessToken = (req) => {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(401, 'Not logged in');
    }
    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
};

const login = asyncHandler(async (req, res) => {
    const email = asString(req.body.email);
    const password = asString(req.body.password);

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const { user, role } = await findUserByEmail(email);
    if (!user || !(await user.isValidPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Students and recruiters need admin approval before they can use the portal
    if (role !== 'admin') {
        assertAccountActive(user, role);
    }

    const tokens = await generateAccessRefreshTokens(user);
    const loggedInUser = await MODELS[role].findById(user._id).select(SAFE_FIELDS);

    // Tokens travel only in httpOnly cookies, never in the response body
    setAuthCookies(res, tokens)
        .status(200)
        .json(new ApiResponse(200, { user: loggedInUser, role }, `${capitalize(role)} logged in successfully`));
});

const logout = asyncHandler(async (req, res) => {
    // Always clear the cookies, even when the token is already invalid
    let decoded = null;
    try {
        decoded = decodeAccessToken(req);
    } catch {
        decoded = null;
    }

    const Model = decoded && MODELS[decoded.role];
    if (Model) {
        await Model.findByIdAndUpdate(decoded._id, { $unset: { refreshToken: 1 } });
    }

    clearAuthCookies(res)
        .status(200)
        .json(new ApiResponse(200, {}, 'Logged out successfully'));
});

// The client's source of truth for "who is logged in"
const getCurrentUser = asyncHandler(async (req, res) => {
    const decoded = decodeAccessToken(req);

    const Model = MODELS[decoded.role];
    const user = Model ? await Model.findById(decoded._id).select(SAFE_FIELDS) : null;
    if (!user) {
        throw new ApiError(401, 'Your session is no longer valid. Please log in again.');
    }
    if (decoded.role !== 'admin') {
        assertAccountActive(user, decoded.role);
    }

    res.status(200).json(new ApiResponse(200, { user, role: decoded.role }, 'User fetched successfully'));
});

const authMe = asyncHandler(async (req, res) => {
    res.json({ authenticated: Boolean(req.cookies.accessToken) });
});

const register = asyncHandler(async (req, res) => {
    const name = asString(req.body.name).trim();
    const email = asString(req.body.email).trim();
    const password = asString(req.body.password);
    const role = asString(req.body.role);

    if (!name || !email || !password || !role) {
        throw new ApiError(400, 'All fields are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, 'Invalid email format');
    }
    if (name.length > 100) {
        throw new ApiError(400, 'Name is too long');
    }

    // Admin accounts cannot be self-registered
    if (role !== 'student' && role !== 'company') {
        throw new ApiError(400, 'Please choose Student or Recruiter');
    }
    validatePassword(password);

    const { user: existing } = await findUserByEmail(email);
    if (existing) {
        throw new ApiError(400, 'An account with this email already exists');
    }

    const Model = MODELS[role];
    const created = await Model.create({ name, email, password });
    const createdUser = await Model.findById(created._id).select(SAFE_FIELDS);

    res.status(201).json(new ApiResponse(201, createdUser, `${capitalize(role)} registered successfully. Your account is awaiting admin approval.`));
});

// A disabled student/recruiter asks the admin to re-enable their account.
// Credentials are required so nobody can file requests for someone else's account.
const requestEnable = asyncHandler(async (req, res) => {
    const email = asString(req.body.email);
    const password = asString(req.body.password);
    const message = asString(req.body.message);

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const { user, role } = await findUserByEmail(email);
    if (!user || role === 'admin' || !(await user.isValidPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }

    if (user.accountStatus !== 'disabled') {
        throw new ApiError(400, user.accountStatus === 'active'
            ? 'Your account is already enabled'
            : 'Your account is awaiting approval; no request is needed');
    }

    user.enableRequest = {
        requested: true,
        message: message.trim().slice(0, 500),
        requestedAt: new Date(),
    };
    await user.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, {}, 'Your request has been sent to the admin'));
});

// PUT /auth/change-password (any logged-in role)
const changePassword = asyncHandler(async (req, res) => {
    const currentPassword = asString(req.body.currentPassword);
    const newPassword = asString(req.body.newPassword);

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current and new password are required');
    }
    validatePassword(newPassword);
    if (currentPassword === newPassword) {
        throw new ApiError(400, 'New password must be different from the current one');
    }

    const user = await MODELS[req.role].findById(req.user._id);
    if (!(await user.isValidPassword(currentPassword))) {
        throw new ApiError(400, 'Current password is incorrect');
    }

    user.password = newPassword;
    // Rotate tokens so other sessions using the old refresh token are signed out
    const tokens = await generateAccessRefreshTokens(user);

    setAuthCookies(res, tokens)
        .status(200)
        .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

export { login, logout, getCurrentUser, register, authMe, requestEnable, changePassword, MIN_PASSWORD_LENGTH };
