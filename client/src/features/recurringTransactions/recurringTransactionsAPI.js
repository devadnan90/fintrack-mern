import api from "../../services/api";
export const recurringTransactionsAPI = {
  list: () =>
    api
      .get("/recurring-transactions")
      .then((r) => r.data.recurringTransactions),
  create: (payload) =>
    api
      .post("/recurring-transactions", payload)
      .then((r) => r.data.recurringTransaction),
  update: (id, payload) =>
    api
      .put(`/recurring-transactions/${id}`, payload)
      .then((r) => r.data.recurringTransaction),
  remove: (id) =>
    api.delete(`/recurring-transactions/${id}`).then((r) => r.data),
};
