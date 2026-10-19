import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: './.env' });

const { connectdb } = await import("../db/connection.db.js");
const { ensureAdmin } = await import("../utils/ensureAdmin.js");

try {
    await connectdb();
    const admin = await ensureAdmin();
    if (admin) console.log(`Admin ready: ${admin.email}`);
} catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
