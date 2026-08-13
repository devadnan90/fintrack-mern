import api from "../../services/api";
export const budgetTemplatesAPI = {
  list: () => api.get("/budget-templates").then((r) => r.data.templates),
  create: (payload) =>
    api.post("/budget-templates", payload).then((r) => r.data.template),
  remove: (id) => api.delete(`/budget-templates/${id}`).then((r) => r.data),
  apply: (id) => api.post(`/budget-templates/${id}/apply`).then((r) => r.data),
};
