import jwt from "jsonwebtoken";
import crypto from "crypto";
const TWO_FACTOR_SECRET = crypto
  .createHmac("sha256", process.env.JWT_ACCESS_SECRET || "dev-secret")
  .update("fintrack-2fa-pending")
  .digest("hex");
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    },
  );
}
export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
    },
  );
}
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}
export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
export function signTwoFactorToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      purpose: "2fa-pending",
    },
    TWO_FACTOR_SECRET,
    {
      expiresIn: "5m",
    },
  );
}
export function verifyTwoFactorToken(token) {
  const decoded = jwt.verify(token, TWO_FACTOR_SECRET);
  if (decoded.purpose !== "2fa-pending") {
    throw new Error("Invalid token purpose");
  }
  return decoded;
}
export function expiryToDate(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }[unit];
  return new Date(Date.now() + value * unitMs);
}
