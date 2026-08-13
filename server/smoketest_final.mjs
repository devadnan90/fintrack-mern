process.env.JWT_ACCESS_SECRET = "t";
process.env.JWT_REFRESH_SECRET = "t2";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

const { default: app } = await import("./src/app.js");
const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api`;
  const allRoutes = [
    "/auth/me", "/users/me", "/accounts", "/categories", "/transactions",
    "/reports/net-worth", "/reports/spending-by-category", "/reports/trend", "/reports/export.csv",
    "/investments", "/insights/summary", "/budgets", "/goals", "/bills",
  ];
  let ok = true;
  for (const path of allRoutes) {
    const res = await fetch(base + path);
    const pass = res.status === 401;
    if (!pass) ok = false;
    console.log(`GET ${path} -> ${res.status} ${pass ? "OK" : "UNEXPECTED"}`);
  }
  const health = await fetch(base + "/health");
  console.log("GET /health ->", health.status, health.status === 200 ? "OK" : "UNEXPECTED");
  server.close(() => {
    console.log(ok && health.status === 200 ? "FULL SMOKE TEST PASSED" : "SMOKE TEST FAILED");
    process.exit(ok ? 0 : 1);
  });
});
