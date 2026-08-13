import adminApi, { setAdminToken } from "../../services/adminApi";
export const adminAPI = {
  login: (email, password) =>
    adminApi
      .post("/admin/login", {
        email,
        password,
      })
      .then((r) => {
        setAdminToken(r.data.token);
        return r.data;
      }),
  logout: () => setAdminToken(null),
  listUsers: () => adminApi.get("/admin/users").then((r) => r.data.users),
  getUserDetail: (id) => adminApi.get(`/admin/users/${id}`).then((r) => r.data),
  banUser: (id) => adminApi.post(`/admin/users/${id}/ban`).then((r) => r.data),
  unbanUser: (id) =>
    adminApi.post(`/admin/users/${id}/unban`).then((r) => r.data),
  getHealth: () => adminApi.get("/admin/health").then((r) => r.data),
  reconnectDatabase: () =>
    adminApi.post("/admin/health/reconnect").then((r) => r.data),
  listLoginActivity: (params) =>
    adminApi
      .get("/admin/login-activity", {
        params,
      })
      .then((r) => r.data.entries),
  listErrorLogs: (params) =>
    adminApi
      .get("/admin/errors", {
        params,
      })
      .then((r) => r.data.errors),
  listWebhookEvents: (params) =>
    adminApi
      .get("/admin/webhooks", {
        params,
      })
      .then((r) => r.data.events),
  razorpay: {
    getConfig: () => adminApi.get("/admin/razorpay/config").then((r) => r.data),
    testConnection: () =>
      adminApi.post("/admin/razorpay/test-connection").then((r) => r.data),
    listOrders: (status) =>
      adminApi
        .get("/admin/razorpay/orders", {
          params: status
            ? {
                status,
              }
            : {},
        })
        .then((r) => r.data.orders),
    fetchOrder: (orderId) =>
      adminApi
        .get(`/admin/razorpay/orders/${orderId}`)
        .then((r) => r.data.order),
    fetchOrderPayments: (orderId) =>
      adminApi
        .get(`/admin/razorpay/orders/${orderId}/payments`)
        .then((r) => r.data.payments),
    fetchPayment: (paymentId) =>
      adminApi
        .get(`/admin/razorpay/payments/${paymentId}`)
        .then((r) => r.data.payment),
    capturePayment: (paymentId, amount, currency) =>
      adminApi
        .post(`/admin/razorpay/payments/${paymentId}/capture`, {
          amount,
          currency,
        })
        .then((r) => r.data.payment),
    refundPayment: (paymentId, amount, notes) =>
      adminApi
        .post(`/admin/razorpay/payments/${paymentId}/refund`, {
          amount,
          notes,
        })
        .then((r) => r.data.refund),
    listRefunds: (paymentId) =>
      adminApi
        .get(`/admin/razorpay/payments/${paymentId}/refunds`)
        .then((r) => r.data.refunds),
    getRevenueSummary: () =>
      adminApi.get("/admin/razorpay/revenue-summary").then((r) => r.data),
  },
};
