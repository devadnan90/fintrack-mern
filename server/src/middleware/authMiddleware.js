import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { verifyAccessToken } from "../utils/generateTokens.js";
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error("Not authorized: no token provided");
  }
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    res.status(401);
    throw new Error("Not authorized: invalid or expired token");
  }
  const user = await User.findById(decoded.sub);
  if (!user) {
    res.status(401);
    throw new Error("Not authorized: user no longer exists");
  }
  if (user.banned) {
    res.status(403);
    throw new Error("This account has been suspended.");
  }
  req.user = user;
  next();
});
