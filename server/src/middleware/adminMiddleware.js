import asyncHandler from "express-async-handler";
import { verifyAdminToken } from "../utils/adminAuth.js";
export const protectAdmin = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error("Not authorized: no admin token provided");
  }
  try {
    verifyAdminToken(token);
  } catch {
    res.status(401);
    throw new Error("Not authorized: invalid or expired admin token");
  }
  next();
});
