import api from "../../services/api";
export const splitBillsAPI = {
  list: () => api.get("/split-bills").then((r) => r.data.splits),
  create: (payload) =>
    api.post("/split-bills", payload).then((r) => r.data.split),
  update: (id, payload) =>
    api.put(`/split-bills/${id}`, payload).then((r) => r.data.split),
  remove: (id) => api.delete(`/split-bills/${id}`).then((r) => r.data),
  settleParticipant: (id, participantId, recordAsIncome) =>
    api
      .post(`/split-bills/${id}/participants/${participantId}/settle`, {
        recordAsIncome,
      })
      .then((r) => r.data),
  downloadReceipt: (id, participantId) =>
    api
      .get(`/split-bills/${id}/participants/${participantId}/receipt.pdf`, {
        responseType: "blob",
      })
      .then((r) => r.data),
};
