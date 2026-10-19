import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import { redisStatus } from "./db/redis.db.js";
import { sanitizeRequest } from "./middlewares/sanitize.middleware.js";

const app = express();

app.disable("x-powered-by");
// Behind Vercel's proxy (or nginx in Docker, TRUST_PROXY=true) the client IP comes from
// X-Forwarded-For (used by rate limiting)
if (process.env.VERCEL || process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
// Security headers. Resumes are opened from the frontend's origin, so allow same-site resource loads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));


app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.static("Public"));
app.use(cookieParser());
app.use(sanitizeRequest);

//Route imports here
import studentRoutes from "./routes/student.route.js";
import companyRoutes from "./routes/company.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import resumeRoutes from "./routes/resume.route.js";

// Liveness/readiness probe for load balancers and container orchestrators
app.get("/api/health", async (req, res) => {
    const mongo = mongoose.connection.readyState === 1 ? "up" : "down";
    const redis = await redisStatus();
    const healthy = mongo === "up" && redis !== "down";
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", mongo, redis });
});

//Routes
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);

// Unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({ statusCode: 404, success: false, message: "Not found", data: null, errors: [] });
});

// Error handler: return ApiError (and unexpected errors) as JSON instead of Express's HTML page
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const statusCode = Number.isInteger(err.statusCode)
        ? err.statusCode
        : (err.name === "ValidationError" || err.name === "CastError") ? 400 : 500;
    if (statusCode >= 500) console.error(err);
    // Never leak internal error details (stack traces, database messages) to clients
    const isExpected = Number.isInteger(err.statusCode) || statusCode < 500;
    res.status(statusCode).json({
        statusCode,
        success: false,
        message: isExpected ? (err.message || "Request failed") : "Internal Server Error",
        data: err.data ?? null,
        errors: err.errors || [],
    });
});

export { app };
