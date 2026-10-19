import {Router} from "express";
import {
    login,
    logout,
    getCurrentUser,
    register,
    authMe,
    requestEnable,
    changePassword
} from "../controllers/auth.controller.js";
import { verifyAnyUser } from "../middlewares/auth.middleware.js";
import { loginLimiter, registerLimiter, sensitiveActionLimiter } from "../middlewares/rateLimit.middleware.js";

const authRoutes = Router();

authRoutes.post("/login", loginLimiter, login);
authRoutes.post("/logout", logout);
authRoutes.post("/register", registerLimiter, register);
authRoutes.get("/me", getCurrentUser);
authRoutes.get("/auth-me", authMe);
authRoutes.post("/request-enable", sensitiveActionLimiter, requestEnable);
authRoutes.put("/change-password", sensitiveActionLimiter, verifyAnyUser, changePassword);

export default authRoutes;
