const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MAX_REPORTS_PER_SESSION = 20;
let reportCount = 0;
function send(message, stack) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount += 1;
  fetch(`${baseURL}/client-errors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: String(message || "Unknown client error").slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      path: window.location.href,
    }),
    keepalive: true,
  }).catch(() => {});
}
export function initErrorReporter() {
  window.addEventListener("error", (event) => {
    send(event.message, event.error?.stack);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    send(reason?.message || String(reason), reason?.stack);
  });
}
