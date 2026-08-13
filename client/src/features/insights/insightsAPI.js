import api from "../../services/api";
export const insightsAPI = {
  summary: () => api.get("/insights/summary").then((r) => r.data),
  ask: (question) =>
    api
      .post("/insights/ask", {
        question,
      })
      .then((r) => r.data),
};
