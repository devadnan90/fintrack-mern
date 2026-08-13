import api from "../../services/api";
export const budgetsAPI = {
  list: () => api.get("/budgets").then((r) => r.data.budgets),
  create: (payload) => api.post("/budgets", payload).then((r) => r.data.budget),
  update: (id, payload) =>
    api.put(`/budgets/${id}`, payload).then((r) => r.data.budget),
  remove: (id) => api.delete(`/budgets/${id}`).then((r) => r.data),
};
