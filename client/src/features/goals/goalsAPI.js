import api from "../../services/api";
export const goalsAPI = {
  list: () => api.get("/goals").then((r) => r.data.goals),
  create: (payload) => api.post("/goals", payload).then((r) => r.data.goal),
  update: (id, payload) =>
    api.put(`/goals/${id}`, payload).then((r) => r.data.goal),
  contribute: (id, amount) =>
    api
      .post(`/goals/${id}/contributions`, {
        amount,
      })
      .then((r) => r.data),
  remove: (id) => api.delete(`/goals/${id}`).then((r) => r.data),
};
