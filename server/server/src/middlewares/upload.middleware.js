import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

// Files are held in memory and then uploaded to Cloudinary (see utils/resumeStorage.js)
const uploadResume = multer({
    storage: multer.memoryStorage(),
    // 4 MB: Vercel rejects request bodies over 4.5 MB
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new ApiError(400, "Resume must be a PDF file"));
        }
        cb(null, true);
    },
}).single("resume");

// Wraps multer so its errors (e.g. file too large) reach the JSON error handler as 400s
const handleResumeUpload = (req, res, next) => {
    uploadResume(req, res, (err) => {
        if (!err) {
            // Content check: a real PDF starts with "%PDF-"
            if (req.file && req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
                return next(new ApiError(400, "The uploaded file is not a valid PDF"));
            }
            return next();
        }
        if (err instanceof multer.MulterError) {
            const message = err.code === "LIMIT_FILE_SIZE" ? "Resume must be 4 MB or smaller" : err.message;
            return next(new ApiError(400, message));
        }
        next(err);
    });
};

export { handleResumeUpload };
