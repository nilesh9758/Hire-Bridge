import jwt from 'jsonwebtoken';
import Student from '../models/student.model.js';
import Company from '../models/company.model.js';
import Admin from '../models/admin.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertAccountActive } from '../utils/accountStatus.js';
import { CacheKeys, cached } from '../utils/cache.js';

const MODELS = { student: Student, company: Company, admin: Admin };
const USER_FIELDS = '-password -refreshToken -passwordResetToken';
const USER_CACHE_SECONDS = 60;

const decodeToken = (req) => {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, 'Token not provided');
    }

    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, 'Please authenticate');
    }
};

const loadUser = async (decoded) => {
    const Model = MODELS[decoded.role];
    if (!Model) {
        throw new ApiError(401, 'Please authenticate');
    }

    // Every authenticated request needs the account, so it is cached briefly. The models
    // drop the entry on any write, so disabling an account still takes effect immediately.
    const raw = await cached(CacheKeys.user(decoded.role, decoded._id), USER_CACHE_SECONDS, () =>
        Model.findOne({ _id: decoded._id }).select(USER_FIELDS).lean()
    );
    if (!raw) {
        throw new ApiError(401, 'Please authenticate');
    }
    // Back to a real document so ObjectIds and Dates have their proper types
    const user = Model.hydrate(raw);

    // Students and recruiters lose access as soon as the admin disables them
    if (decoded.role !== 'admin') {
        assertAccountActive(user, decoded.role);
    }
    return user;
};

const verifyUser = (role) => asyncHandler(async (req, res, next) => {
    const decoded = decodeToken(req);

    if (decoded.role !== role) {
        throw new ApiError(401, `You are not authorized to access this route as a ${role}`);
    }

    req[role] = await loadUser(decoded);
    next();
});

// Any logged-in role; sets req.user and req.role
const verifyAnyUser = asyncHandler(async (req, res, next) => {
    const decoded = decodeToken(req);
    req.user = await loadUser(decoded);
    req.role = decoded.role;
    next();
});

const verifyStudent = verifyUser('student');
const verifyCompany = verifyUser('company');
const verifyAdmin = verifyUser('admin');

export { verifyStudent, verifyCompany, verifyAdmin, verifyAnyUser };
