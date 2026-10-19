import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError.js";

// Resumes are stored on Cloudinary as private ("authenticated") raw files: they have no
// public URL, so the only way to read one is through the permission-checked /resume
// routes, which fetch it with a short-lived signed link and stream it to the browser.
// Each file is stored under its generated name (e.g. "<uuid>.pdf").
const FOLDER = "hirebridge/resumes";
const FILE_OPTIONS = { resource_type: "raw", type: "authenticated" };
const DOWNLOAD_LINK_SECONDS = 60;

let configured = false;

const client = () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new ApiError(503, "Resume storage is not configured. Please try again later.");
    }
    if (!configured) {
        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
            secure: true,
        });
        configured = true;
    }
    return cloudinary;
};

const publicId = (fileName) => `${FOLDER}/${fileName}`;

const saveResume = (fileName, buffer, originalName) =>
    new Promise((resolve, reject) => {
        client()
            .uploader.upload_stream(
                {
                    ...FILE_OPTIONS,
                    public_id: publicId(fileName),
                    asset_folder: FOLDER,
                    overwrite: false,
                    context: { originalName },
                },
                (error, result) => (error ? reject(new Error(`Resume upload failed: ${error.message}`)) : resolve(result))
            )
            .end(buffer);
    });

// Returns { stream, length } for the stored PDF, or null when it does not exist
const fetchResume = async (fileName) => {
    const url = client().utils.private_download_url(publicId(fileName), undefined, {
        ...FILE_OPTIONS,
        expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_SECONDS,
    });
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok || !response.body) {
        throw new Error(`Resume download failed with status ${response.status}`);
    }
    return {
        stream: Readable.fromWeb(response.body),
        length: Number(response.headers.get("content-length")) || undefined,
    };
};

const deleteResume = (fileName) => client().uploader.destroy(publicId(fileName), { ...FILE_OPTIONS, invalidate: true });

export { saveResume, fetchResume, deleteResume };
