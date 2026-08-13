import api from "../../services/api";
export const pushAPI = {
  status: () => api.get("/push/status").then((r) => r.data),
  vapidPublicKey: () =>
    api.get("/push/vapid-public-key").then((r) => r.data.publicKey),
  subscribe: (subscription) =>
    api.post("/push/subscribe", subscription).then((r) => r.data),
  unsubscribe: (endpoint) =>
    api
      .post("/push/unsubscribe", {
        endpoint,
      })
      .then((r) => r.data),
};
