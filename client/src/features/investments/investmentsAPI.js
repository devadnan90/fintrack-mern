import api from "../../services/api";
export const investmentsAPI = {
  list: () => api.get("/investments").then((r) => r.data),
  create: (payload) =>
    api.post("/investments", payload).then((r) => r.data.investment),
  update: (id, payload) =>
    api.put(`/investments/${id}`, payload).then((r) => r.data.investment),
  remove: (id) => api.delete(`/investments/${id}`).then((r) => r.data),
};
