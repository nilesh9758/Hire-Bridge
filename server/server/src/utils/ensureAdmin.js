import Admin from "../models/admin.model.js";

// The admin has no sign-up flow: the account is created from ADMIN_* values in .env
// the first time the server starts (or via `npm run seed:admin`).
const ensureAdmin = async () => {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin account creation");
        return null;
    }

    const existing = await Admin.findOne({ email });
    if (existing) return existing;

    const admin = await Admin.create({
        name: process.env.ADMIN_NAME || "Placement Admin",
        email,
        password,
    });
    console.log(`Admin account created: ${email}`);
    return admin;
};

export { ensureAdmin };
