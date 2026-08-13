import LoginActivity from "../models/LoginActivity.js";
import { getClientIp, parseUserAgent, lookupGeoFromIp } from "./requestMeta.js";
export function recordLoginActivity(
  req,
  { user = null, email = null, success, method, reason = null },
) {
  const ip = getClientIp(req);
  const ua = parseUserAgent(req.headers["user-agent"]);
  LoginActivity.create({
    user: user?._id || user || null,
    email: email || user?.email || null,
    success,
    method,
    reason,
    ip,
    browser: ua.browser,
    os: ua.os,
    deviceType: ua.deviceType,
    userAgent: ua.raw,
  })
    .then((doc) => {
      if (!ip) return;
      lookupGeoFromIp(ip)
        .then((geo) => {
          if (!geo) return;
          doc.country = geo.country;
          doc.region = geo.region;
          doc.city = geo.city;
          return doc.save();
        })
        .catch(() => {});
    })
    .catch((err) => {
      console.error("[loginActivity] failed to record:", err.message);
    });
}
