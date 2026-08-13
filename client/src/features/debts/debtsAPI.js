import api from "../../services/api";
export const debtsAPI = {
  list: () => api.get("/debts").then((r) => r.data.debts),
  create: (payload) => api.post("/debts", payload).then((r) => r.data.debt),
  update: (id, payload) =>
    api.put(`/debts/${id}`, payload).then((r) => r.data.debt),
  remove: (id) => api.delete(`/debts/${id}`).then((r) => r.data),
  getPlan: (strategy, extraMonthlyPayment) =>
    api
      .get("/debts/plan", {
        params: {
          strategy,
          extraMonthlyPayment,
        },
      })
      .then((r) => r.data),
};
