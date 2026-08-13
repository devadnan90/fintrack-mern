import api from "../../services/api";
export const merchantRulesAPI = {
  list: () => api.get("/merchant-rules").then((r) => r.data.rules),
  create: (payload) =>
    api.post("/merchant-rules", payload).then((r) => r.data.rule),
  update: (id, payload) =>
    api.put(`/merchant-rules/${id}`, payload).then((r) => r.data.rule),
  remove: (id) => api.delete(`/merchant-rules/${id}`).then((r) => r.data),
  apply: (id) => api.post(`/merchant-rules/${id}/apply`).then((r) => r.data),
};
