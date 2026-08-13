import api from "../../services/api";
export const accountsAPI = {
  list: () => api.get("/accounts").then((r) => r.data.accounts),
  create: (payload) =>
    api.post("/accounts", payload).then((r) => r.data.account),
  get: (id) => api.get(`/accounts/${id}`).then((r) => r.data),
  update: (id, payload) =>
    api.put(`/accounts/${id}`, payload).then((r) => r.data.account),
  remove: (id) => api.delete(`/accounts/${id}`).then((r) => r.data),
};
