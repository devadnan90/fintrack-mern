export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}
function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  if (/CriOS\//.test(ua)) return "Chrome (iOS)";
  if (/FxiOS\//.test(ua)) return "Firefox (iOS)";
  return "Unknown";
}
function detectOs(ua) {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) return "macOS";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}
function detectDeviceType(ua) {
  if (/iPad|Tablet/.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android.*Mobile/.test(ua)) return "mobile";
  return "desktop";
}
export function parseUserAgent(uaString) {
  const ua = uaString || "";
  return {
    raw: ua,
    browser: detectBrowser(ua),
    os: detectOs(ua),
    deviceType: detectDeviceType(ua),
  };
}
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];
function isPrivateIp(ip) {
  if (!ip) return true;
  return PRIVATE_IP_PATTERNS.some((re) => re.test(ip));
}
export async function lookupGeoFromIp(ip) {
  if (isPrivateIp(ip)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "success") return null;
    return {
      country: data.country || null,
      region: data.regionName || null,
      city: data.city || null,
    };
  } catch {
    return null;
  }
}
