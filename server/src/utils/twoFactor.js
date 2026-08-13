import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
const EPOCH_TOLERANCE_SECONDS = 30;
export function generateTotpSecret() {
  return generateSecret();
}
export async function buildSetupPayload(email, secret) {
  const otpauthUrl = generateURI({
    issuer: "FinTrack",
    label: email,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}
export async function verifyTotp(token, secret) {
  if (!token || !secret) return false;
  try {
    const result = await verify({
      secret,
      token: String(token).replace(/\s/g, ""),
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    });
    return Boolean(result.valid);
  } catch {
    return false;
  }
}
const BACKUP_CODE_COUNT = 8;
export function generateBackupCodes() {
  return Array.from(
    {
      length: BACKUP_CODE_COUNT,
    },
    () => crypto.randomBytes(5).toString("hex"),
  );
}
export function hashBackupCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code).trim().toLowerCase())
    .digest("hex");
}
