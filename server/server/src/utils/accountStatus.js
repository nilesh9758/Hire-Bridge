import { ApiError } from "./ApiError.js";

// Throws a 403 with a machine-readable code when a student/recruiter account is not
// allowed into the portal. The login page uses the code to show the right message.
const assertAccountActive = (user, role) => {
    const status = user.accountStatus || "pending";
    if (status === "active") return;

    const error = status === "disabled"
        ? new ApiError(403, "Your account has been disabled by the admin. You can request the admin to enable it.")
        : new ApiError(403, "Your profile isn't enabled yet. Please wait for the admin to approve your account.");

    error.data = {
        code: status === "disabled" ? "ACCOUNT_DISABLED" : "ACCOUNT_PENDING",
        role,
        enableRequested: Boolean(user.enableRequest?.requested),
    };
    throw error;
};

export { assertAccountActive };
