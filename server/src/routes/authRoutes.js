import express from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
  verifyTwoFactorLogin,
  passkeyLoginOptions,
  passkeyLoginVerify,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiters.js";
const router = express.Router();
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/2fa/verify-login", authLimiter, verifyTwoFactorLogin);
router.post("/passkey/login-options", authLimiter, passkeyLoginOptions);
router.post("/passkey/login-verify", authLimiter, passkeyLoginVerify);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
export default router;
