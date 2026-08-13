import jwt from "jsonwebtoken";
import crypto from "crypto";
const ADMIN_TOKEN_EXPIRES = process.env.ADMIN_JWT_EXPIRES || "12h";
function adminSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not configured");
  }
  return secret;
}
export function isAdminConfigured() {
  return Boolean(
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_JWT_SECRET,
  );
}
function safeEqual(a, b) {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
export function verifyAdminCredentials(email, password) {
  if (!isAdminConfigured()) return false;
  const emailMatches = safeEqual(
    (email || "").trim().toLowerCase(),
    process.env.ADMIN_EMAIL.trim().toLowerCase(),
  );
  const passwordMatches = safeEqual(password || "", process.env.ADMIN_PASSWORD);
  return emailMatches && passwordMatches;
}
export function signAdminToken() {
  return jwt.sign(
    {
      role: "admin",
      purpose: "admin-session",
    },
    adminSecret(),
    {
      expiresIn: ADMIN_TOKEN_EXPIRES,
    },
  );
}
export function verifyAdminToken(token) {
  const decoded = jwt.verify(token, adminSecret());
  if (decoded.role !== "admin" || decoded.purpose !== "admin-session") {
    throw new Error("Invalid admin token");
  }
  return decoded;
}
