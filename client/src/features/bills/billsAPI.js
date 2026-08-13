import api from "../../services/api";
export const billsAPI = {
  list: () => api.get("/bills").then((r) => r.data.bills),
  create: (payload) => api.post("/bills", payload).then((r) => r.data.bill),
  update: (id, payload) =>
    api.put(`/bills/${id}`, payload).then((r) => r.data.bill),
  pay: (id) => api.post(`/bills/${id}/pay`).then((r) => r.data),
  remove: (id) => api.delete(`/bills/${id}`).then((r) => r.data),
};
