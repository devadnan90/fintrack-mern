import api from "../../services/api";
export const householdsAPI = {
  list: () => api.get("/households").then((r) => r.data.households),
  create: (payload) =>
    api.post("/households", payload).then((r) => r.data.household),
  remove: (id) => api.delete(`/households/${id}`).then((r) => r.data),
  leave: (id) => api.post(`/households/${id}/leave`).then((r) => r.data),
  removeMember: (id, userId) =>
    api.delete(`/households/${id}/members/${userId}`).then((r) => r.data),
  invite: (id, email) =>
    api
      .post(`/households/${id}/invites`, {
        email,
      })
      .then((r) => r.data),
  myInvites: () =>
    api.get("/households/invites/mine").then((r) => r.data.invites),
  acceptInvite: (token) =>
    api
      .post("/households/accept", {
        token,
      })
      .then((r) => r.data),
};
