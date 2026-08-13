import api from "../../services/api";
export const reportsAPI = {
  netWorth: () => api.get("/reports/net-worth").then((r) => r.data),
  netWorthHistory: (months) =>
    api
      .get("/reports/net-worth-history", {
        params: {
          months,
        },
      })
      .then((r) => r.data),
  spendingByCategory: (params) =>
    api
      .get("/reports/spending-by-category", {
        params,
      })
      .then((r) => r.data),
  trend: (months) =>
    api
      .get("/reports/trend", {
        params: {
          months,
        },
      })
      .then((r) => r.data),
  exportCsv: () =>
    api
      .get("/reports/export.csv", {
        responseType: "blob",
      })
      .then((r) => r.data),
  exportPdf: (params) =>
    api
      .get("/reports/export.pdf", {
        params,
        responseType: "blob",
      })
      .then((r) => r.data),
  exportXlsx: (params) =>
    api
      .get("/reports/export.xlsx", {
        params,
        responseType: "blob",
      })
      .then((r) => r.data),
  cashFlowForecast: (days) =>
    api
      .get("/reports/cash-flow-forecast", {
        params: {
          days,
        },
      })
      .then((r) => r.data),
  sendReportNow: (frequency) =>
    api
      .post("/reports/send-now", {
        frequency,
      })
      .then((r) => r.data),
  calendar: (year, month) =>
    api
      .get("/reports/calendar", {
        params: {
          year,
          month,
        },
      })
      .then((r) => r.data),
};
