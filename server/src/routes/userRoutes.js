import express from "express";
import {
  updateProfile,
  changePassword,
  deleteAccount,
  exportData,
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateBackupCodes,
} from "../controllers/userController.js";
import {
  listPasskeys,
  startPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
} from "../controllers/passkeyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
const router = express.Router();
router.put("/me", protect, updateProfile);
router.put("/me/password", protect, changePassword);
router.delete("/me", protect, deleteAccount);
router.get("/me/export", protect, exportData);
router.post("/me/2fa/setup", protect, startTwoFactorSetup);
router.post("/me/2fa/confirm", protect, authLimiter, confirmTwoFactorSetup);
router.post("/me/2fa/disable", protect, authLimiter, disableTwoFactor);
router.post(
  "/me/2fa/backup-codes",
  protect,
  authLimiter,
  regenerateBackupCodes,
);
router.get("/me/passkeys", protect, listPasskeys);
router.post("/me/passkeys/register-options", protect, startPasskeyRegistration);
router.post(
  "/me/passkeys/register-verify",
  protect,
  authLimiter,
  finishPasskeyRegistration,
);
router.delete("/me/passkeys/:id", protect, deletePasskey);
export default router;
