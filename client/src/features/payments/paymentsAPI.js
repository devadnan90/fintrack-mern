import api from "../../services/api";
export const paymentsAPI = {
  config: () => api.get("/payments/config").then((r) => r.data),
  createOrder: (plan) =>
    api
      .post("/payments/order", {
        plan,
      })
      .then((r) => r.data),
  verify: (payload) =>
    api.post("/payments/verify", payload).then((r) => r.data),
};
