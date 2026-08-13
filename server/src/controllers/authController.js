import asyncHandler from "express-async-handler";
import crypto from "crypto";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import Passkey from "../models/Passkey.js";
import { seedDefaultCategories } from "../utils/seedCategories.js";
import { assertStrongPassword } from "../utils/validators.js";
import { sendMail } from "../utils/mailer.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  expiryToDate,
  signTwoFactorToken,
  verifyTwoFactorToken,
} from "../utils/generateTokens.js";
import { verifyTotp, hashBackupCode } from "../utils/twoFactor.js";
import {
  buildAuthenticationOptions,
  verifyAuthentication,
} from "../utils/webauthn.js";
import { recordLoginActivity } from "../utils/loginActivity.js";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
const REFRESH_COOKIE = "fintrack_refresh";
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
async function issueSession(
  req,
  res,
  user,
  { method = "password", logActivity = true } = {},
) {
  if (user.banned) {
    if (logActivity)
      recordLoginActivity(req, {
        user,
        success: false,
        method,
        reason: "account banned",
      });
    res.status(403);
    throw new Error(
      "This account has been suspended. Contact support if you think this is a mistake.",
    );
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: expiryToDate(process.env.JWT_REFRESH_EXPIRES || "7d"),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  if (logActivity)
    recordLoginActivity(req, {
      user,
      success: true,
      method,
    });
  return accessToken;
}
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, baseCurrency } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are all required");
  }
  assertStrongPassword(res, password);
  const existing = await User.findOne({
    email: email.toLowerCase(),
  });
  if (existing) {
    res.status(409);
    throw new Error("An account with that email already exists");
  }
  const user = await User.create({
    name,
    email,
    password,
    baseCurrency: baseCurrency || "USD",
  });
  await seedDefaultCategories(user._id);
  const accessToken = await issueSession(req, res, user, {
    method: "password",
  });
  res.status(201).json({
    user: user.toSafeObject(),
    accessToken,
  });
});
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    recordLoginActivity(req, {
      email,
      success: false,
      method: "password",
      reason: "invalid credentials",
    });
    res.status(401);
    throw new Error("Invalid email or password");
  }
  if (user.twoFactor?.enabled) {
    res.json({
      requiresTwoFactor: true,
      twoFactorToken: signTwoFactorToken(user),
    });
    return;
  }
  const accessToken = await issueSession(req, res, user, {
    method: "password",
  });
  res.json({
    user: user.toSafeObject(),
    accessToken,
  });
});
export const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const { twoFactorToken, token, backupCode } = req.body;
  if (!twoFactorToken || (!token && !backupCode)) {
    res.status(400);
    throw new Error(
      "twoFactorToken and either a token or backupCode are required",
    );
  }
  let decoded;
  try {
    decoded = verifyTwoFactorToken(twoFactorToken);
  } catch {
    res.status(401);
    throw new Error("This login attempt has expired. Please log in again.");
  }
  const user = await User.findById(decoded.sub).select(
    "+twoFactor.secret +twoFactor.backupCodeHashes",
  );
  if (!user || !user.twoFactor?.enabled) {
    res.status(401);
    throw new Error(
      "Two-factor authentication is not enabled for this account",
    );
  }
  let ok = false;
  if (token) {
    ok = await verifyTotp(token, user.twoFactor.secret);
  } else {
    const hash = hashBackupCode(backupCode);
    const idx = user.twoFactor.backupCodeHashes.indexOf(hash);
    if (idx !== -1) {
      ok = true;
      user.twoFactor.backupCodeHashes.splice(idx, 1);
      await user.save();
    }
  }
  if (!ok) {
    recordLoginActivity(req, {
      user,
      success: false,
      method: "2fa",
      reason: "invalid code",
    });
    res.status(401);
    throw new Error("Invalid or expired code");
  }
  const accessToken = await issueSession(req, res, user, {
    method: "2fa",
  });
  res.json({
    user: user.toSafeObject(),
    accessToken,
  });
});
function fakePasskeyOptions() {
  return {
    challenge: crypto.randomBytes(32).toString("base64url"),
    rpId: new URL(process.env.CLIENT_URL || "http://localhost:5173").hostname,
    timeout: 60000,
    userVerification: "preferred",
    allowCredentials: [],
    extensions: {},
  };
}
export const passkeyLoginOptions = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("email is required");
  }
  const user = await User.findOne({
    email: email.toLowerCase(),
  });
  if (!user) {
    res.json(fakePasskeyOptions());
    return;
  }
  const passkeys = await Passkey.find({
    user: user._id,
  });
  if (passkeys.length === 0) {
    res.json(fakePasskeyOptions());
    return;
  }
  const options = await buildAuthenticationOptions(passkeys);
  user.currentChallenge = options.challenge;
  await user.save();
  res.json(options);
});
export const passkeyLoginVerify = asyncHandler(async (req, res) => {
  const { email, response } = req.body;
  if (!email || !response) {
    res.status(400);
    throw new Error("email and response are required");
  }
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+currentChallenge");
  if (!user || !user.currentChallenge) {
    res.status(401);
    throw new Error("This login attempt has expired. Please try again.");
  }
  const passkey = await Passkey.findOne({
    user: user._id,
    credentialId: response.id,
  });
  if (!passkey) {
    res.status(401);
    throw new Error("Passkey not recognized");
  }
  let verification;
  try {
    verification = await verifyAuthentication(
      response,
      user.currentChallenge,
      passkey,
    );
  } catch {
    verification = {
      verified: false,
    };
  }
  user.currentChallenge = null;
  await user.save();
  if (!verification.verified) {
    recordLoginActivity(req, {
      user,
      success: false,
      method: "passkey",
      reason: "verification failed",
    });
    res.status(401);
    throw new Error("Passkey verification failed");
  }
  passkey.counter = verification.authenticationInfo.newCounter;
  passkey.lastUsedAt = new Date();
  await passkey.save();
  const accessToken = await issueSession(req, res, user, {
    method: "passkey",
  });
  res.json({
    user: user.toSafeObject(),
    accessToken,
  });
});
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401);
    throw new Error("No refresh token provided");
  }
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.status(401);
    throw new Error("Refresh token is invalid or expired");
  }
  const stored = await RefreshToken.findOne({
    token,
    user: decoded.sub,
  });
  if (!stored) {
    res.status(401);
    throw new Error("Refresh token has been revoked");
  }
  const user = await User.findById(decoded.sub);
  if (!user) {
    res.status(401);
    throw new Error("User no longer exists");
  }
  await stored.deleteOne();
  const accessToken = await issueSession(req, res, user, {
    logActivity: false,
  });
  res.json({
    user: user.toSafeObject(),
    accessToken,
  });
});
export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await RefreshToken.deleteOne({
      token,
    });
  }
  res.clearCookie(REFRESH_COOKIE, {
    path: "/api/auth",
  });
  res.status(200).json({
    message: "Logged out",
  });
});
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    user: req.user.toSafeObject(),
  });
});
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }
  const genericResponse = {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
  const user = await User.findOne({
    email: email.toLowerCase(),
  });
  if (!user) {
    res.json(genericResponse);
    return;
  }
  await PasswordResetToken.deleteMany({
    user: user._id,
  });
  const rawToken = crypto.randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your FinTrack password",
    text: `We received a request to reset your FinTrack password.\n\nReset it here (expires in 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your FinTrack password.</p><p><a href="${resetUrl}">Reset your password</a> (expires in 1 hour).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
  res.json(genericResponse);
});
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Reset token is required");
  }
  assertStrongPassword(res, newPassword);
  const resetToken = await PasswordResetToken.findOne({
    tokenHash: hashToken(token),
    expiresAt: {
      $gt: new Date(),
    },
  });
  if (!resetToken) {
    res.status(400);
    throw new Error(
      "This reset link is invalid or has expired. Request a new one.",
    );
  }
  const user = await User.findById(resetToken.user);
  if (!user) {
    res.status(400);
    throw new Error(
      "This reset link is invalid or has expired. Request a new one.",
    );
  }
  user.password = newPassword;
  await user.save();
  await PasswordResetToken.deleteMany({
    user: user._id,
  });
  await RefreshToken.deleteMany({
    user: user._id,
  });
  res.json({
    message: "Password reset. Please log in with your new password.",
  });
});
